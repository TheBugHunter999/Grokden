<script lang="ts">
  import type { AppSettings } from "$lib/editor-utils";
  import Terminal from "$lib/Terminal.svelte";
  import AgentActivityCompact from "$lib/AgentActivityCompact.svelte";
  import { attachParser, detachParser } from "$lib/agent-activity/activity-bridge";
  import {
    clearActivitySessions,
    createActivitySession,
    removeSessionsByTerminalId,
  } from "$lib/agent-activity/activity-store";
  import {
    buildAgentGrokCommand,
    clampAgentCount,
    computeAgentGridLayout,
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

  let gridLayout = $derived(computeAgentGridLayout(agents.length || agentCount));
  let groupedGoals = $derived(groupGoalsByCategory(goals));
  let launchLabel = $derived(
    launching
      ? "Launching…"
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
    agentTerminalIds = { ...agentTerminalIds, [agentId]: terminalId };
    agentDetachFns[agentId]?.();
    const session = createActivitySession(label, terminalId);
    agentDetachFns = { ...agentDetachFns, [agentId]: attachParser(session.id, terminalId) };
    markAgentRunning(agentId);
  }

  function cleanupAgentActivity(agentId: string) {
    const tid = agentTerminalIds[agentId];
    if (tid != null) {
      detachParser(tid);
      removeSessionsByTerminalId(tid);
    }
    agentDetachFns[agentId]?.();
    const { [agentId]: _t, ...restT } = agentTerminalIds;
    const { [agentId]: _d, ...restD } = agentDetachFns;
    agentTerminalIds = restT;
    agentDetachFns = restD;
  }

  function launchAgents() {
    if (launching) return;
    if (grokCliAvailable === false) {
      onGrokCliMissing?.();
      return;
    }
    launching = true;

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
    agents = agents.map((a) =>
      a.id === id ? { ...a, injectToken: a.injectToken + 1, status: "launching" as const } : a,
    );
  }

  function removeAgent(id: string) {
    cleanupAgentActivity(id);
    agents = agents.filter((a) => a.id !== id);
  }

  function clearAgents() {
    for (const agent of agents) cleanupAgentActivity(agent.id);
    clearActivitySessions();
    agents = [];
    launching = false;
    agentTerminalIds = {};
    agentDetachFns = {};
  }

  function resizeAgentSlots() {
    const count = clampAgentCount(agentCount);
    if (agents.length === 0) return;
    if (agents.length > count) {
      agents = agents.slice(0, count);
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

  const statusLabel: Record<ParallelAgent["status"], string> = {
    idle: "Ready",
    launching: "Starting",
    running: "Active",
    done: "Done",
    error: "Error",
  };
</script>

<div class="swarm">
  <header class="swarm-toolbar">
    <div class="swarm-title">
      <img class="swarm-logo" src="/favicon.png" alt="" width="28" height="28" />
      <div>
        <h2 class="swarm-heading">Parallel Agent Swarm</h2>
        <p class="swarm-sub">Launch Grok terminals side-by-side. Type your own prompts in each pane.</p>
      </div>
    </div>
    <div class="swarm-controls">
      <label class="count-control">
        <span class="count-label">Agents</span>
        <div class="count-stepper">
          <button
            type="button"
            class="count-btn"
            aria-label="Fewer agents"
            disabled={agentCount <= 1 || agents.length > 0}
            onclick={() => (agentCount = clampAgentCount(agentCount - 1))}
          >−</button>
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
      <div class="swarm-actions">
        <button type="button" class="swarm-btn" onclick={clearAgents} disabled={!agents.length}>Clear</button>
        {#if agents.length > 0 && agents.length !== clampAgentCount(agentCount)}
          <button type="button" class="swarm-btn" onclick={resizeAgentSlots}>Resize to {agentCount}</button>
        {/if}
        <button type="button" class="swarm-btn primary" class:busy={launching} onclick={launchAgents}>
          {launchLabel}
        </button>
        <button type="button" class="swarm-btn" onclick={onClose}>Back to Editor</button>
      </div>
    </div>
  </header>

  <div class="swarm-body">
    <section class="agent-grid" style="--grid-cols: {gridLayout.cols}; --grid-rows: {gridLayout.rows}">
      {#if agents.length === 0}
        {#each Array(clampAgentCount(agentCount)) as _, i (i)}
          <div class="agent-cell empty-slot">
            <div class="cell-head">
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
        {#each agents as agent (agent.id)}
          <div class="agent-cell" class:active={agent.status === "running"}>
            <div class="cell-head">
              <span class="cell-pip" class:live={agent.status === "running" || agent.status === "launching"}></span>
              <span class="cell-title">{agent.label}</span>
              <AgentActivityCompact terminalId={agentTerminalIds[agent.id] ?? null} />
              <span class="cell-status" class:running={agent.status === "running"}>
                {statusLabel[agent.status]}
              </span>
              <button type="button" class="cell-relaunch" title="Relaunch terminal" onclick={() => relaunchAgent(agent.id)}>↻</button>
              <button type="button" class="cell-close" title="Remove agent" onclick={() => removeAgent(agent.id)}>×</button>
            </div>
            <div class="cell-terminal">
              {#if agent.status !== "idle"}
                <Terminal
                  {settings}
                  {cwd}
                  sessionActive={true}
                  visible={true}
                  compact={true}
                  enableHelper={false}
                  injectToken={agent.injectToken}
                  injectCommand={grokCommand || buildAgentGrokCommand(settings)}
                  onSpawned={(tid) => handleAgentSpawned(agent.id, agent.label, tid)}
                />
              {:else}
                <div class="cell-idle">Press Launch or ↻ to start this agent</div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </section>

    <aside class="mission-board">
      <div class="board-head">
        <h3>Mission Board</h3>
        <span class="board-count">{goals.length} goals</span>
      </div>
      <p class="board-note">Add goals for your own reference. Goals are not sent to agents automatically.</p>

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
          <p class="board-empty">No goals yet. Add one above to plan your swarm.</p>
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
                        disabled={agents.length >= MAX_AGENTS || agents.some((a) => a.goalId === goal.id)}
                        onclick={() => assignGoalToSlot(goal)}
                      >
                        Slot
                      </button>
                      <button type="button" class="goal-remove" title="Remove goal" onclick={() => removeGoal(goal.id)}>×</button>
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
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--editor-bg);
    overflow: hidden;
  }

  .swarm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .swarm-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .swarm-logo {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .swarm-heading { margin: 0; font-size: 14px; font-weight: 500; color: var(--text); }
  .swarm-sub { margin: 2px 0 0; font-size: 11px; color: var(--text-mute); }

  .swarm-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
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
    border-radius: 5px;
    overflow: hidden;
  }
  .count-btn {
    width: 28px;
    height: 28px;
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

  .swarm-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .swarm-btn {
    padding: 5px 12px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text-dim);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .swarm-btn:hover:not(:disabled) { background: var(--hover); color: var(--text); }
  .swarm-btn:disabled { opacity: 0.35; cursor: default; }
  .swarm-btn.primary { color: var(--accent); border-color: var(--accent-mid); background: var(--accent-soft); }
  .swarm-btn.primary:hover:not(:disabled) { background: var(--accent-mid); }
  .swarm-btn.busy { opacity: 0.6; cursor: wait; }

  .swarm-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }

  .agent-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(var(--grid-cols, 2), 1fr);
    grid-template-rows: repeat(var(--grid-rows, 2), 1fr);
    gap: 1px;
    min-width: 0;
    background: var(--border);
    overflow: hidden;
  }

  .agent-cell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg);
    overflow: hidden;
  }
  .agent-cell.active { box-shadow: inset 0 0 0 1px var(--accent-mid); }

  .cell-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--panel-solid);
    border-bottom: 1px solid var(--border);
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
    background: var(--success);
    opacity: 1;
    animation: pulse-live 1.4s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .cell-index { font-size: 10px; color: var(--text-mute); width: 14px; }
  .cell-title {
    font-size: 11px;
    font-weight: 500;
    color: var(--text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cell-status { font-size: 9px; color: var(--text-mute); flex-shrink: 0; }
  .cell-status.running { color: var(--success); }
  .cell-status.muted { opacity: 0.6; }

  .cell-relaunch, .cell-close {
    padding: 0 4px;
    font-size: 12px;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 3px;
  }
  .cell-relaunch:hover, .cell-close:hover { background: var(--hover); color: var(--text); }

  .empty-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .empty-hint { font-size: 11px; color: var(--text-mute); font-style: italic; text-align: center; }

  .cell-terminal { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
  .cell-idle {
    flex: 1;
    display: grid;
    place-items: center;
    font-size: 12px;
    color: var(--text-mute);
    font-style: italic;
    padding: 12px;
    text-align: center;
  }

  .mission-board {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
    background: var(--panel);
    min-height: 0;
  }

  .board-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 6px;
    flex-shrink: 0;
  }
  .board-head h3 { margin: 0; font-size: 12px; font-weight: 500; color: var(--text); }
  .board-count { font-size: 10px; color: var(--text-mute); }
  .board-note {
    margin: 0;
    padding: 0 14px 10px;
    font-size: 10px;
    color: var(--text-mute);
    line-height: 1.4;
    flex-shrink: 0;
  }

  .add-goal {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 10px 10px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .goal-input, .goal-textarea, .goal-edit {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    font-size: 11px;
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

  .board-scroll { flex: 1; overflow-y: auto; padding: 10px; }
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
    gap: 6px;
    padding: 10px 14px;
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