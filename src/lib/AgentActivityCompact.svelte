<script lang="ts">
  import { getTerminalCompactActivity } from "$lib/agent-activity/activity-store";

  type Props = { terminalId: number | null };
  let { terminalId }: Props = $props();

  const compact = $derived(
    terminalId != null ? getTerminalCompactActivity(terminalId) : undefined,
  );
</script>

{#if compact?.currentTitle}
  <span
    class="compact-activity"
    class:approval={compact.status === "awaiting_approval"}
    title={compact.currentTitle}
  >
    <span class="pip" class:live={compact.status !== "done"}></span>
    <span class="label">{compact.currentTitle}</span>
  </span>
{/if}

<style>
  .compact-activity {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    min-width: 0;
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
    min-width: 0;
    flex: 1 1 auto;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>