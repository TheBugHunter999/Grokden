<script lang="ts">
  import { getTerminalCompactActivity } from "$lib/agent-activity/activity-store";

  type Props = { terminalId: number | null };
  let { terminalId }: Props = $props();

  const compact = $derived(
    terminalId != null ? getTerminalCompactActivity(terminalId) : undefined,
  );
</script>

<span
  class="compact-activity"
  class:approval={compact?.status === "awaiting_approval"}
  class:empty={!compact?.currentTitle}
  title={compact?.currentTitle ?? ""}
>
  <span class="pip" class:live={compact && compact.status !== "done"}></span>
  <span class="label">{compact?.currentTitle ?? ""}</span>
</span>

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
  .compact-activity.empty {
    visibility: hidden;
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