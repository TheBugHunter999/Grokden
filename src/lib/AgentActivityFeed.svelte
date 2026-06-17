<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    getActivitySessions,
    getActiveActivitySession,
    setActiveActivitySession,
    pruneStaleSessions,
    isSessionLive,
  } from "$lib/agent-activity/activity-store";
  import type { AgentRunStatus, AgentStep } from "$lib/agent-activity/types";
  import { formatStepFiles } from "$lib/agent-activity/display-text";

  const sessions = $derived(getActivitySessions());
  const active = $derived(getActiveActivitySession());
  let stepListEl = $state<HTMLUListElement | undefined>();
  let stickToBottom = $state(true);
  let lastActiveId = $state<string | null>(null);

  $effect(() => {
    const id = active?.id ?? null;
    if (id !== lastActiveId) {
      lastActiveId = id;
      stickToBottom = true;
      if (stepListEl) stepListEl.scrollTop = 0;
    }
  });

  $effect(() => {
    const count = active?.steps.length ?? 0;
    if (!stepListEl || count === 0 || !stickToBottom) return;
    void tick().then(() => {
      if (stepListEl) stepListEl.scrollTop = stepListEl.scrollHeight;
    });
  });

  onMount(() => {
    const timer = setInterval(() => pruneStaleSessions(), 8000);
    return () => clearInterval(timer);
  });

  function statusLabel(status: AgentRunStatus): string {
    switch (status) {
      case "thinking": return "Thinking";
      case "tool_running": return "Running";
      case "awaiting_approval": return "Awaiting approval";
      case "done": return "Done";
      case "error": return "Error";
      default: return "Idle";
    }
  }

  function stepIcon(step: AgentStep): string {
    if (step.kind === "permission") return "?";
    if (step.kind === "thought") return "…";
    switch (step.toolKind) {
      case "read": return "R";
      case "write": return "W";
      case "execute": return "▶";
      case "search": return "⌕";
      default: return "•";
    }
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
</script>

<div class="activity-feed">
  {#if sessions.length === 0}
    <div class="empty">
      <p class="empty-title">No active agents</p>
      <p class="empty-hint">Launch Grok CLI or start a parallel agent swarm to see live steps here.</p>
    </div>
  {:else}
    {#if sessions.length > 1}
      <div class="session-tabs" role="tablist" aria-label="Agent sessions">
        {#each sessions as session (session.id)}
          <button
            type="button"
            role="tab"
            class="session-tab"
            class:active={active?.id === session.id}
            aria-selected={active?.id === session.id}
            onclick={() => setActiveActivitySession(session.id)}
          >
            <span class="tab-pip" class:live={isSessionLive(session)}></span>
            {session.label}
          </button>
        {/each}
      </div>
    {/if}

    {#if active}
      <div class="session-header">
        {#if isSessionLive(active)}
          <span class="status-chip" class:approval={active.status === "awaiting_approval"} class:running={active.status === "tool_running" || active.status === "thinking"}>
            {statusLabel(active.status)}
          </span>
        {/if}
        {#if active.currentTitle}
          <span class="current-title" title={active.currentTitle}>{active.currentTitle}</span>
        {/if}
      </div>

      <ul
        class="step-list dark-scrollbar"
        bind:this={stepListEl}
        onscroll={(e) => {
          const el = e.currentTarget;
          stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {#if active.steps.length === 0}
          <li class="step-empty">
            {isSessionLive(active) ? "Waiting for agent output…" : "Agent is idle."}
          </li>
        {:else}
          {#each active.steps as step (step.id)}
            <li class="step" class:running={step.status === "running"} class:done={step.status === "success"}>
              <span class="step-icon" class:permission={step.kind === "permission"}>{stepIcon(step)}</span>
              <div class="step-body">
                <span class="step-title" title={step.title}>{step.title}</span>
                {#if step.files?.length}
                  <span class="step-files" title={step.files.join("\n")}>
                    {formatStepFiles(step.files)}
                  </span>
                {/if}
              </div>
              <span class="step-time">{formatTime(step.startedAt)}</span>
            </li>
          {/each}
        {/if}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .activity-feed {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 0;
    min-width: 0;
    flex: 1;
    overflow: hidden;
    padding-top: 10px;
    contain: layout style;
  }
  .empty {
    padding: 24px 14px;
    text-align: center;
  }
  .empty-title {
    margin: 0 0 6px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .empty-hint {
    margin: 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-mute);
  }
  .session-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 12px 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .session-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--border);
    background: var(--chip-bg);
    color: var(--text-mute);
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .session-tab.active {
    color: var(--text);
    background: var(--hover);
    border-color: var(--border);
    box-shadow: inset 0 -1px 0 var(--text-mute);
  }
  .tab-pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-mute);
    flex-shrink: 0;
    opacity: 0.5;
  }
  .tab-pip.live {
    background: var(--text-dim);
    opacity: 1;
  }
  .session-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px 4px;
  }
  .status-chip {
    align-self: flex-start;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--text-mute);
    background: var(--chip-bg);
  }
  .status-chip.running {
    color: var(--text-dim);
    border-color: var(--border);
    background: var(--hover);
  }
  .status-chip.approval {
    color: var(--warn);
    border-color: var(--border);
    background: var(--chip-bg);
  }
  .current-title {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .step-list {
    list-style: none;
    margin: 0;
    padding: 4px 8px 12px;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
    min-width: 0;
    scrollbar-gutter: stable;
  }
  .step-empty {
    padding: 12px;
    font-size: 11px;
    color: var(--text-mute);
    text-align: center;
  }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 7px 6px;
    border-radius: 6px;
    transition: background 0.15s;
    min-width: 0;
  }
  .step.running { background: var(--hover); }
  .step.done { opacity: 0.72; }
  .step-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    background: var(--chip-bg);
    color: var(--text-mute);
    flex-shrink: 0;
  }
  .step-icon.permission { color: var(--warn); }
  .step.running .step-icon {
    color: var(--text);
    background: var(--chip-bg);
  }
  .step-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .step-title {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .step.running .step-title { color: var(--text); }
  .step-files {
    font-size: 10px;
    color: var(--text-mute);
    font-family: var(--code-font);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .step-time {
    font-size: 9px;
    color: var(--text-mute);
    flex-shrink: 0;
    padding-top: 2px;
  }
</style>