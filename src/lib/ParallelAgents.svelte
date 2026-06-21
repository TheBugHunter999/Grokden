<script lang="ts">
  import { onDestroy } from "svelte";
  import type { AppSettings } from "$lib/editor-utils";
  import Terminal from "$lib/Terminal.svelte";
  import AgentActivityCompact from "$lib/AgentActivityCompact.svelte";
  import { mergeAgentWorktree, removeAgentWorktree } from "$lib/worktree-bridge";
  import { attachParser, detachParser } from "$lib/agent-activity/activity-bridge";
  import {
    createActivitySession,
    removeSessionsByTerminalId,
  } from "$lib/agent-activity/activity-store";
  import {
    buildAgentGrokCommand,
    buildAgentSpecificGrokCommand,
    buildAgentInjectPrompt,
    clampAgentCount,
    computeAgentGridLayout,
    shouldSpanAgentCell,
    createAgentId,
    createEmptyAgents,
    createEmptyGoal,
    groupGoalsByCategory,
    MAX_AGENTS,
    pickGoalsForNewAgents,
    type MissionGoal,
    type ParallelAgent,
  } from "$lib/agent-grid";

  let {
    settings,
    cwd = null,
    agents = $bindable(),
    goals = $bindable([] as MissionGoal[]),
    grokCommand,
    grokCliAvailable = null,
    onGrokCliMissing,
    onClose,
  }: {
    settings: AppSettings;
    cwd?: string | null;
    agents: ParallelAgent[];
    goals?: MissionGoal[];
    grokCommand: string;
    grokCliAvailable?: boolean | null;
    onGrokCliMissing?: () => void;
    onClose: () => void;
  } = $props();

  let launching = $state(false);
  let agentCount = $state(2);
  let newGoalTitle = $state("");
  let newGoalNotes = $state("");
  let newGoalCategory = $state("Goals");
  let agentTerminalIds = $state<Record<string, number>>({});
  let agentDetachFns = $state<Record<string, () => void>>({});
  let swarmBodyEl = $state<HTMLDivElement | undefined>();
  let swarmBodyWidth = $state(0);
  let goalsPanelOpen = $state(false);
  let moreMenuOpen = $state(false);
  let worktreeNotice = $state("");

  const SWARM_COMPACT_WIDTH = 960;
  let compactLayout = $derived(swarmBodyWidth > 0 && swarmBodyWidth < SWARM_COMPACT_WIDTH);

  let slotCount = $derived(agents.length || agentCount);
  let gridLayout = $derived(computeAgentGridLayout(slotCount));
  let groupedGoals = $derived(groupGoalsByCategory(goals));
  let launchLabel = $derived(
    launching
      ? "Launching..."
      : agents.length
        ? `Relaunch ${agents.length}`
        : `Launch ${agentCount} Agent${agentCount === 1 ? "" : "s"}`,
  );

  function markAgentRunning(id: string) {
    agents = agents.map((a) =>
      a.id === id && a.status === "launching" ? { ...a, status: "running" as const } : a,
    );
    if (!agents.some((a) => a.status === "launching")) launching = false;
  }

  function handleAgentSpawned(agentId: string, label: string, terminalId: number) {
    const oldTid = agentTerminalIds[agentId];
    if (oldTid != null && oldTid !== terminalId) {
      detachParser(oldTid);
      removeSessionsByTerminalId(oldTid);
    }
    agentDetachFns[agentId]?.();
    agentTerminalIds = { ...agentTerminalIds, [agentId]: terminalId };
    const session = createActivitySession(label, terminalId);
    agentDetachFns = { ...agentDetachFns, [agentId]: attachParser(session.id, terminalId) };
  }

  function markAgentError(agentId: string) {
    agents = agents.map((agent) =>
      agent.id === agentId ? { ...agent, status: "error" as const } : agent,
    );
    if (!agents.some((agent) => agent.status === "launching")) launching = false;
  }

  function cleanupAgentActivity(agentId: string) {
    const tid = agentTerminalIds[agentId];
    agentDetachFns[agentId]?.();
    if (tid != null) {
      detachParser(tid);
      removeSessionsByTerminalId(tid);
    }
    const { [agentId]: _t, ...restT } = agentTerminalIds;
    const { [agentId]: _d, ...restD } = agentDetachFns;
    agentTerminalIds = restT;
    agentDetachFns = restD;
  }

  function beginAgentRelaunch(agentId: string) {
    cleanupAgentActivity(agentId);
  }

  function launchAgents() {
    if (launching) return;
    if (grokCliAvailable === false) {
      onGrokCliMissing?.();
      return;
    }
    launching = true;

    if (agents.length > 0) {
      for (const agent of agents) beginAgentRelaunch(agent.id);
    }

    const count = agents.length > 0 ? agents.length : clampAgentCount(agentCount);
    if (agents.length === 0) {
      agents = createEmptyAgents(count, pickGoalsForNewAgents(goals, [], count));
    }

    agents = agents.map((agent) => ({
      ...agent,
      injectToken: agent.injectToken + 1,
      status: "launching" as const,
    }));
  }

  function relaunchAgent(id: string) {
    if (grokCliAvailable === false) {
      onGrokCliMissing?.();
      return;
    }
    beginAgentRelaunch(id);
    agents = agents.map((a) =>
      a.id === id ? { ...a, injectToken: a.injectToken + 1, status: "launching" as const } : a,
    );
  }

  function removeAgent(id: string) {
    cleanupAgentActivity(id);
    agents = agents.filter((a) => a.id !== id);
  }

  async function finishWorktree(agent: ParallelAgent, action: "merge" | "discard") {
    if (!agent.worktreePath || !agent.cwd || !agent.branch) return;
    const verb = action === "merge"
      ? "merge this agent branch into the current branch"
      : "discard this agent worktree and delete its branch";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    agents = agents.map((item) => item.id === agent.id ? { ...item, status: "idle" as const } : item);
    cleanupAgentActivity(agent.id);
    worktreeNotice = action === "merge" ? `Merging ${agent.label}…` : `Discarding ${agent.label}…`;
    try {
      if (action === "merge") {
        await mergeAgentWorktree({ workspacePath: agent.cwd, worktreePath: agent.worktreePath, branch: agent.branch });
      } else {
        await removeAgentWorktree({ workspacePath: agent.cwd, worktreePath: agent.worktreePath, branch: agent.branch });
      }
      agents = agents.filter((item) => item.id !== agent.id);
      worktreeNotice = action === "merge" ? `${agent.label} merged.` : `${agent.label} discarded.`;
    } catch (error) {
      worktreeNotice = `${agent.label}: ${String(error)}`;
    }
  }

  function releaseAllAgentState() {
    const ids = new Set([
      ...agents.map((agent) => agent.id),
      ...Object.keys(agentTerminalIds),
      ...Object.keys(agentDetachFns),
    ]);
    for (const id of ids) cleanupAgentActivity(id);
    agents = [];
    launching = false;
    agentTerminalIds = {};
    agentDetachFns = {};
  }

  function clearAgents() {
    releaseAllAgentState();
  }

  function handleClose() {
    releaseAllAgentState();
    onClose();
  }

  onDestroy(() => {
    releaseAllAgentState();
  });

  function resizeAgentSlots() {
    const count = clampAgentCount(agentCount);
    if (agents.length === 0) return;
    if (agents.length > count) {
      for (const agent of agents.slice(count)) cleanupAgentActivity(agent.id);
      agents = agents.slice(0, count);
      agentCount = count;
      return;
    }
    if (agents.length < count) {
      const add = count - agents.length;
      const extra = createEmptyAgents(
        add,
        pickGoalsForNewAgents(goals, agents, add),
      );
      extra.forEach((a, i) => {
        if (!a.goalId) a.label = `Agent ${agents.length + i + 1}`;
      });
      agents = [...agents, ...extra];
    }
  }

  function addGoal() {
    const title = newGoalTitle.trim();
    if (!title) return;
    goals = [
      ...goals,
      createEmptyGoal({
        title,
        notes: newGoalNotes,
        category: newGoalCategory,
      }),
    ];
    newGoalTitle = "";
    newGoalNotes = "";
  }

  function removeGoal(id: string) {
    goals = goals.filter((g) => g.id !== id);
    agents = agents.map((a) =>
      a.goalId === id ? { ...a, goalId: null, label: a.label } : a,
    );
  }

  function updateGoal(id: string, field: keyof MissionGoal, value: string) {
    goals = goals.map((g) => (g.id === id ? { ...g, [field]: value } : g));
    agents = agents.map((a) => {
      if (a.goalId !== id) return a;
      if (field === "title") return { ...a, label: value.trim() || a.label };
      return a;
    });
  }

  function assignGoalToSlot(goal: MissionGoal) {
    if (agents.length >= MAX_AGENTS) return;
    const taken = new Set(agents.map((a) => a.goalId).filter(Boolean));
    if (taken.has(goal.id)) return;
    agents = [
      ...agents,
      {
        id: createAgentId(),
        label: goal.title,
        goalId: goal.id,
        injectToken: 0,
        status: "idle",
      },
    ];
    agentCount = clampAgentCount(agents.length);
  }

  $effect(() => {
    const el = swarmBodyEl;
    if (!el) return;
    swarmBodyWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      swarmBodyWidth = el.clientWidth;
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  $effect(() => {
    if (!compactLayout) goalsPanelOpen = false;
  });

  $effect(() => {
    if (!moreMenuOpen) return;
    const close = () => (moreMenuOpen = false);
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".toolbar-menu")) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  });

  const statusLabel: Record<ParallelAgent["status"], string> = {
    idle: "Ready",
    launching: "Starting",
    running: "Active",
    done: "Done",
    error: "Error",
  };
</script>

<div class="swarm" class:no-animations={!settings.enableAnimations}>
  <header class="swarm-toolbar glass glass--pill">
    <div class="swarm-title">
      <img class="swarm-logo" src="/favicon.png" alt="" width="20" height="20" />
      <div>
        <h2 class="swarm-heading">Parallel Agents</h2>
      </div>
      {#if worktreeNotice}
        <span class="swarm-worktree-notice" title={worktreeNotice}>{worktreeNotice}</span>
      {/if}
    </div>
    <div class="swarm-toolbar-main">
      <label class="count-control">
        <span class="count-label">Agents</span>
        <div class="count-stepper">
          <button
            type="button"
            class="count-btn"
            aria-label="Fewer agents"
            disabled={agentCount <= 1 || agents.length > 0}
            onclick={() => (agentCount = clampAgentCount(agentCount - 1))}
          >-</button>
          <span class="count-value">{agents.length || agentCount}</span>
          <button
            type="button"
            class="count-btn"
            aria-label="More agents"
            disabled={agentCount >= MAX_AGENTS || agents.length > 0}
            onclick={() => (agentCount = clampAgentCount(agentCount + 1))}
          >+</button>
        </div>
      </label>
      <button type="button" class="swarm-btn btn btn--primary" class:busy={launching} onclick={launchAgents}>
        {launchLabel}
      </button>
      {#if compactLayout}
        <button
          type="button"
          class="swarm-btn btn btn--secondary"
          class:active={goalsPanelOpen}
          aria-expanded={goalsPanelOpen}
          onclick={() => (goalsPanelOpen = !goalsPanelOpen)}
        >
          Goals{#if goals.length > 0} ({goals.length}){/if}
        </button>
      {/if}
      <div class="toolbar-menu">
        <button
          type="button"
          class="swarm-btn btn btn--ghost menu-trigger"
          aria-expanded={moreMenuOpen}
          aria-haspopup="menu"
          onclick={() => (moreMenuOpen = !moreMenuOpen)}
        >
          More
        </button>
        {#if moreMenuOpen}
          <div class="toolbar-menu-pop glass" role="menu">
            <button
              type="button"
              role="menuitem"
              class="menu-item"
              disabled={!agents.length}
              onclick={() => { clearAgents(); moreMenuOpen = false; }}
            >Clear agents</button>
            {#if agents.length > 0 && agents.length !== clampAgentCount(agentCount)}
              <button
                type="button"
                role="menuitem"
                class="menu-item"
                onclick={() => { resizeAgentSlots(); moreMenuOpen = false; }}
              >Resize to {agentCount}</button>
            {/if}
            <button
              type="button"
              role="menuitem"
              class="menu-item"
              onclick={() => { handleClose(); moreMenuOpen = false; }}
            >Back to Editor</button>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <div class="swarm-body" class:compact-layout={compactLayout} bind:this={swarmBodyEl}>
    <section
      class="agent-grid"
      style="grid-template-columns: repeat({gridLayout.cols}, minmax(0, 1fr)); grid-template-rows: repeat({gridLayout.rows}, minmax(0, 1fr));"
    >
      {#if agents.length === 0}
        {#each Array(clampAgentCount(agentCount)) as _, i (i)}
          <div class="agent-cell card empty-slot" class:span-cols={shouldSpanAgentCell(slotCount, i)}>
            <div class="cell-head glass">
              <span class="cell-index">{i + 1}</span>
              <span class="cell-title">Agent {i + 1}</span>
              <span class="cell-status muted">Not started</span>
            </div>
            <div class="empty-body">
              <span class="empty-hint">Press Launch to open a Grok terminal here</span>
            </div>
          </div>
        {/each}
      {:else}
        {#each agents as agent, i (agent.id)}
          <div
            class="agent-cell card"
            class:active={agent.status === "running"}
            class:launching={agent.status === "launching"}
            class:error={agent.status === "error"}
            class:done={agent.status === "done"}
            class:span-cols={shouldSpanAgentCell(slotCount, i)}
          >
            <div class="cell-head glass">
              <span class="cell-pip" class:live={agent.status === "running" || agent.status === "launching"}></span>
              <div class="cell-head-main">
                <span class="cell-title" title={agent.label}>{agent.label}</span>
                <span class="cell-model" title="Model">{agent.model || settings.grokModel}</span>
                {#if agent.worktreeIsolation}
                  <span class="cell-isolation" title={agent.worktreePath || agent.branch || "Isolated Git worktree"}>isolated</span>
                {/if}
                {#if agentTerminalIds[agent.id] != null && agent.status !== "launching"}
                  <div class="cell-activity-slot">
                    <AgentActivityCompact terminalId={agentTerminalIds[agent.id]} />
                  </div>
                {/if}
              </div>
              <div class="cell-head-actions">
                {#if agent.worktreeIsolation && agent.worktreePath}
                  <button type="button" class="worktree-action" title="Merge this isolated branch" onclick={() => finishWorktree(agent, "merge")}>Merge</button>
                  <button type="button" class="worktree-action danger" title="Discard this isolated worktree" onclick={() => finishWorktree(agent, "discard")}>Discard</button>
                {/if}
                <span class="cell-status" class:running={agent.status === "running"}>
                  {statusLabel[agent.status]}
                </span>
                <button type="button" class="cell-relaunch" title="Relaunch terminal" onclick={() => relaunchAgent(agent.id)}>R</button>
                <button type="button" class="cell-close" title="Remove agent" onclick={() => removeAgent(agent.id)}>x</button>
              </div>
            </div>
            <div class="cell-terminal">
              {#if agent.status !== "idle"}
                  <Terminal
                    {settings}
                    cwd={agent.worktreePath || agent.cwd || cwd}
                    sessionActive={true}
                    visible={true}
                    compact={true}
                    enableHelper={false}
                    restartBeforeInject={true}
                    injectToken={agent.injectToken}
                    injectCommand={agent.model ? buildAgentSpecificGrokCommand(settings, agent) : (grokCommand || buildAgentGrokCommand(settings))}
                    injectPrompt={buildAgentInjectPrompt(agent, goals)}
                    onSpawned={(tid) => handleAgentSpawned(agent.id, agent.label, tid)}
                    onReady={() => markAgentRunning(agent.id)}
                    onError={() => markAgentError(agent.id)}
                  />
              {:else}
                <div class="cell-idle">Press Launch or R to start this agent</div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </section>

    {#if compactLayout && goalsPanelOpen}
      <button
        type="button"
        class="goals-backdrop"
        aria-label="Close goals panel"
        onclick={() => (goalsPanelOpen = false)}
      ></button>
    {/if}

    <aside class="mission-board" class:open={!compactLayout || goalsPanelOpen}>
      <div class="board-head">
        <h3>Mission Board</h3>
        <span class="board-count">{goals.length} goals</span>
      </div>
      <p class="board-note">
        Label agent slots with goals. Assigned goal text is sent when you launch that agent; unassigned goals are notes only.
      </p>

      <form class="add-goal" onsubmit={(e) => { e.preventDefault(); addGoal(); }}>
        <input
          class="goal-input"
          type="text"
          placeholder="Goal title"
          bind:value={newGoalTitle}
        />
        <input
          class="goal-input"
          type="text"
          placeholder="Category (optional)"
          bind:value={newGoalCategory}
        />
        <textarea
          class="goal-textarea"
          placeholder="Notes (optional, for you only)"
          rows="2"
          bind:value={newGoalNotes}
        ></textarea>
        <button type="submit" class="add-goal-btn" disabled={!newGoalTitle.trim()}>Add goal</button>
      </form>

      <div class="board-scroll">
        {#if goals.length === 0}
          <p class="board-empty">No goals yet. Add one above to plan your agent run.</p>
        {:else}
          {#each [...groupedGoals.entries()] as [category, items] (items.map((g) => g.id).join("|"))}
            <div class="board-section">
              <h4 class="board-category">{category}</h4>
              <ul class="board-list">
                {#each items as goal (goal.id)}
                  <li class="board-item">
                    <div class="board-fields">
                      <input
                        class="goal-edit title"
                        type="text"
                        value={goal.title}
                        oninput={(e) => updateGoal(goal.id, "title", e.currentTarget.value)}
                      />
                      <textarea
                        class="goal-edit notes"
                        rows="2"
                        placeholder="Notes"
                        value={goal.notes}
                        oninput={(e) => updateGoal(goal.id, "notes", e.currentTarget.value)}
                      ></textarea>
                      <input
                        class="goal-edit cat"
                        type="text"
                        value={goal.category}
                        oninput={(e) => updateGoal(goal.id, "category", e.currentTarget.value)}
                      />
                    </div>
                    <div class="board-item-actions">
                      <button
                        type="button"
                        class="task-assign"
                        title="Create a labeled agent slot. Goal text is sent when you launch that agent."
                        disabled={agents.length >= MAX_AGENTS || agents.some((a) => a.goalId === goal.id)}
                        onclick={() => assignGoalToSlot(goal)}
                      >
                        Label slot
                      </button>
                      <button type="button" class="goal-remove" title="Remove goal" onclick={() => removeGoal(goal.id)}>x</button>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        {/if}
      </div>

      <div class="board-footer">
        <span class="model-tag">{settings.grokModel}</span>
        {#if settings.aiAgentModeDefault}<span class="model-tag agent">Agent mode</span>{/if}
      </div>
    </aside>
  </div>
</div>

<style>
  .swarm {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    width: 100%;
    background: var(--editor-bg);
    overflow: hidden;
  }

  .swarm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    height: 44px;
    min-height: 44px;
    max-height: 44px;
    padding: 0 14px;
    border-bottom: 1px solid var(--border);
    background: var(--editor-bg);
    flex-shrink: 0;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .swarm-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
  }

  .swarm-logo {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    flex-shrink: 0;
    opacity: 0.9;
  }

  .swarm-heading { margin: 0; font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: 0; }
  .swarm-worktree-notice { max-width: 240px; overflow: hidden; color: var(--text-mute); font: 500 9px/1 "JetBrains Mono", monospace; text-overflow: ellipsis; white-space: nowrap; }

  .swarm-toolbar-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    justify-content: flex-end;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .toolbar-menu {
    position: relative;
    flex: 0 0 auto;
  }

  .toolbar-menu-pop {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 30;
    min-width: 148px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel-solid);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 6px 10px;
    font-size: 11px;
    font-family: inherit;
    text-align: left;
    color: var(--text-dim);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .menu-item:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }

  .menu-item:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .count-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .count-label { font-size: 11px; color: var(--text-mute); }
  .count-stepper {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 1px solid var(--border);
    border-radius: 7px;
    overflow: hidden;
  }
  .count-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: var(--chip-bg);
    color: var(--text-dim);
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
  }
  .count-btn:hover:not(:disabled) { background: var(--hover); color: var(--text); }
  .count-btn:disabled { opacity: 0.35; cursor: default; }
  .count-value {
    min-width: 24px;
    text-align: center;
    font-size: 12px;
    color: var(--text);
  }

  .swarm-btn {
    flex: 0 0 auto;
    padding: 5px 11px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-dim);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .swarm-btn:hover:not(:disabled) { background: var(--hover); color: var(--text); }
  .swarm-btn:disabled { opacity: 0.35; cursor: default; }
  .swarm-btn.primary { color: var(--accent); border-color: var(--accent-mid); background: var(--accent-soft); }
  .swarm-btn.primary:hover:not(:disabled) { background: var(--accent-mid); }
  .swarm-btn.active {
    color: var(--accent);
    border-color: var(--accent-mid);
    background: var(--accent-soft);
  }
  .swarm-btn.busy { opacity: 0.6; cursor: wait; }

  .swarm-body {
    position: relative;
    flex: 1 1 0;
    display: flex;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    align-items: stretch;
  }

  .agent-grid {
    flex: 1 1 0;
    display: grid;
    gap: 10px;
    min-width: 0;
    min-height: 0;
    height: 100%;
    align-content: stretch;
    background: transparent;
    padding: 12px;
    box-sizing: border-box;
    overflow: auto;
  }

  .agent-cell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: min(100%, 260px);
    background: var(--surface-inset, var(--editor-bg, var(--bg)));
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    transition: background 0.15s ease;
  }

  .agent-cell.span-cols {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .agent-cell.active {
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .agent-cell.active .cell-head {
    background: color-mix(in srgb, var(--accent-soft) 14%, var(--panel-solid));
  }

  .agent-cell.launching {
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--accent) 70%, transparent);
  }

  .agent-cell.launching .cell-head {
    background: color-mix(in srgb, var(--accent-soft) 10%, var(--panel-solid));
  }

  .agent-cell.error {
    box-shadow: inset 3px 0 0 var(--danger);
  }

  .agent-cell.error .cell-head {
    background: color-mix(in srgb, var(--danger-soft) 16%, var(--panel-solid));
  }

  .agent-cell.done {
    box-shadow: inset 3px 0 0 var(--success);
  }

  .agent-cell.empty-slot {
    background: color-mix(in srgb, var(--panel) 28%, var(--editor-bg, var(--bg)));
    box-shadow: inset 0 0 0 1px var(--border-muted);
  }

  .cell-head {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 32px;
    padding: 0 9px;
    background: var(--surface-raised, var(--panel-solid));
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .cell-head-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
  }

  .cell-head-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .cell-pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-mute);
    opacity: 0.4;
    flex-shrink: 0;
  }
  .cell-pip.live {
    background: #86efac;
    opacity: 1;
    animation: pulse-live 1.4s ease-in-out infinite;
  }

  .cell-model,
  .cell-isolation {
    flex: 0 1 auto;
    max-width: 126px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 5px;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text-mute);
    background: var(--chip-bg);
    font: 500 8px/1 "JetBrains Mono", monospace;
  }

  .cell-isolation {
    color: var(--accent);
    border-color: var(--accent-mid);
    background: var(--accent-soft);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .worktree-action {
    height: 20px;
    padding: 0 5px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--chip-bg);
    color: var(--text-mute);
    font: 600 8px/1 "JetBrains Mono", monospace;
    cursor: pointer;
  }
  .worktree-action:hover { color: var(--text); background: var(--hover); }
  .worktree-action.danger:hover { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); }

  .agent-cell.launching .cell-pip { background: #fbbf24; opacity: 1; }
  .agent-cell.error .cell-pip { background: #f87171; opacity: 1; }
  .agent-cell.done .cell-pip { background: #7dd3fc; opacity: 1; }
  .agent-cell.active .cell-pip { background: #86efac; opacity: 1; }
  @keyframes pulse-live {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .cell-index { font-size: 10px; color: var(--text-mute); width: 14px; }
  .empty-slot .cell-head { height: 32px; }

  .cell-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--text);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-activity-slot {
    max-width: 140px;
    flex: 0 1 140px;
    min-width: 0;
    overflow: hidden;
  }
  .cell-status {
    font-size: 10px;
    color: var(--text-mute);
    flex-shrink: 0;
    white-space: nowrap;
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--chip-bg);
    border: 1px solid var(--border);
  }
  .cell-status.running { color: var(--success); border-color: color-mix(in srgb, var(--success) 35%, var(--border)); }
  .cell-status.muted { opacity: 0.6; }

  .agent-cell.launching .cell-status {
    color: var(--accent);
    border-color: var(--accent-mid);
    background: var(--accent-soft);
  }

  .cell-relaunch, .cell-close {
    width: 20px;
    height: 20px;
    padding: 0;
    font-size: 10px;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 5px;
  }
  .cell-relaunch:hover, .cell-close:hover { background: var(--hover); color: var(--text); }

  .empty-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }
  .empty-hint { font-size: 11px; color: var(--text-mute); font-family: var(--code-font, monospace); text-align: center; }

  .cell-terminal {
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cell-terminal > :global(.terminal-wrap) {
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
  }
  .cell-idle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    font-size: 11px;
    color: var(--text-mute);
    font-family: var(--code-font, monospace);
  }

  .mission-board {
    width: min(280px, 34vw);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
    background: var(--panel);
    min-height: 0;
  }

  .swarm-body.compact-layout .mission-board {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(280px, 88vw);
    z-index: 20;
    border-left: 1px solid var(--border);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.22);
    display: none;
  }

  .swarm-body.compact-layout .mission-board.open {
    display: flex;
  }

  .goals-backdrop {
    position: absolute;
    inset: 0;
    z-index: 15;
    border: none;
    padding: 0;
    margin: 0;
    background: rgba(0, 0, 0, 0.35);
    cursor: default;
  }

  .board-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 4px;
    flex-shrink: 0;
  }
  .board-head h3 { margin: 0; font-size: 11px; font-weight: 500; color: var(--text); }
  .board-count { font-size: 9px; color: var(--text-mute); }
  .board-note {
    margin: 0;
    padding: 0 10px 6px;
    font-size: 9px;
    color: var(--text-mute);
    line-height: 1.4;
    flex-shrink: 0;
  }

  .add-goal {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 8px 8px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .goal-input, .goal-textarea, .goal-edit {
    width: 100%;
    box-sizing: border-box;
    padding: 4px 6px;
    font-size: 10px;
    font-family: inherit;
    color: var(--text);
    background: var(--hover);
    border: 1px solid var(--border);
    border-radius: 5px;
    outline: none;
  }
  .goal-input:focus, .goal-textarea:focus, .goal-edit:focus { border-color: var(--accent); }
  .goal-textarea { resize: vertical; min-height: 44px; }
  .add-goal-btn {
    padding: 5px 10px;
    font-size: 11px;
    font-family: inherit;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent-mid);
    border-radius: 5px;
    cursor: pointer;
  }
  .add-goal-btn:disabled { opacity: 0.35; cursor: default; }
  .add-goal-btn:hover:not(:disabled) { background: var(--accent-mid); }

  .board-scroll { flex: 1; overflow-y: auto; padding: 6px 8px; }
  .board-empty {
    margin: 0;
    padding: 12px 4px;
    font-size: 11px;
    color: var(--text-mute);
    font-style: italic;
  }

  .board-section { margin-bottom: 12px; }
  .board-category {
    margin: 0 0 6px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--accent);
  }
  .board-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

  .board-item {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: 6px;
    background: var(--chip-bg);
    border: 1px solid var(--border);
  }
  .board-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .goal-edit.title { font-weight: 500; }
  .goal-edit.cat { font-size: 10px; color: var(--text-mute); }
  .goal-edit.notes { font-size: 10px; color: var(--text-dim); min-height: 36px; }

  .board-item-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
  .task-assign {
    padding: 3px 8px;
    font-size: 10px;
    font-family: inherit;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent-mid);
    border-radius: 4px;
    cursor: pointer;
  }
  .task-assign:disabled { opacity: 0.35; cursor: default; }
  .goal-remove {
    padding: 2px 6px;
    font-size: 12px;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 3px;
  }
  .goal-remove:hover { background: var(--danger-soft); color: var(--danger); }

  .board-footer {
    display: flex;
    gap: 4px;
    padding: 6px 10px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .model-tag {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-mute);
    background: var(--chip-bg);
    border: 1px solid var(--border);
  }
  .model-tag.agent { color: var(--accent); }


</style>
