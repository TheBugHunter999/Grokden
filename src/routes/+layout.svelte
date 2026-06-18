<script lang="ts">
  import { onMount } from "svelte";

  let { children } = $props();

  function getLiveParallelAgentCount(): number {
    return document.querySelectorAll(
      ".swarm .agent-cell.active, .swarm .agent-cell.launching",
    ).length;
  }

  function syncParallelAgentSidebar(): void {
    const liveCount = getLiveParallelAgentCount();
    const nav = document.querySelector<HTMLElement>(
      ".codex-nav-item[aria-label='Parallel Agents']",
    );
    const badge = nav?.querySelector<HTMLElement>(".rail-badge.inline");

    if (badge) {
      badge.hidden = liveCount === 0;
      if (liveCount > 0) badge.textContent = String(liveCount);
    }

    const sessionRows = Array.from(
      document.querySelectorAll<HTMLElement>(".codex-session-section .codex-list-row"),
    );
    const parallelRow = sessionRows.find((row) =>
      row.textContent?.toLowerCase().includes("parallel agents"),
    );
    const meta = parallelRow?.querySelector<HTMLElement>(".codex-list-time");
    if (meta) meta.textContent = liveCount > 0 ? `${liveCount} live` : "ready";
  }

  onMount(() => {
    syncParallelAgentSidebar();
    const observer = new MutationObserver(syncParallelAgentSidebar);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"],
    });
    const interval = window.setInterval(syncParallelAgentSidebar, 1200);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  });
</script>

{@render children()}

<style>
  :global(.rail-badge[hidden]) {
    display: none !important;
  }

  :global(.ide.glass-window .activity-rail),
  :global(.ide.glass-window .sidebar),
  :global(.ide.glass-window .secondary-sidebar),
  :global(.ide.glass-window .editor-area) {
    contain: paint;
    isolation: isolate;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  :global(.ide.glass-window .activity-rail) {
    z-index: 3;
  }

  :global(.ide.glass-window .editor-area) {
    position: relative;
    z-index: 1;
  }

  :global(.ide.glass-window .editor-placeholder),
  :global(.ide.glass-window .welcome-center),
  :global(.ide.glass-window .welcome-title),
  :global(.ide.glass-window .welcome-composer),
  :global(.ide.glass-window .welcome-actions) {
    position: relative;
    z-index: 1;
  }

  :global(.ide.glass-window .rail-btn:hover),
  :global(.ide.glass-window .codex-list-row:hover:not(:disabled)),
  :global(.ide.glass-window .codex-project-row:hover) {
    background: color-mix(in srgb, var(--hover) 76%, transparent);
    box-shadow: inset 0 0 0 1px transparent;
  }
</style>
