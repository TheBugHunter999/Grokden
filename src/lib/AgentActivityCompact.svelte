<script lang="ts">
  import { getSessionByTerminalId } from "$lib/agent-activity/activity-store";

  type Props = { terminalId: number | null };
  let { terminalId }: Props = $props();

  const session = $derived(terminalId != null ? getSessionByTerminalId(terminalId) : undefined);
</script>

{#if session?.currentTitle}
  <span class="compact-activity" class:approval={session.status === "awaiting_approval"} title={session.currentTitle}>
    <span class="pip" class:live={session.status !== "done"}></span>
    <span class="label">{session.currentTitle}</span>
  </span>
{/if}

<style>
  .compact-activity {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 140px;
    font-size: 10px;
    color: var(--text-mute);
    overflow: hidden;
  }
  .compact-activity.approval { color: var(--warn); }
  .pip {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-mute);
    flex-shrink: 0;
  }
  .pip.live {
    background: var(--text-dim);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>