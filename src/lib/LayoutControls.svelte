<script lang="ts">
  let {
    modLabel,
    activityBarExpanded,
    explorerOpen,
    terminalOpen,
    secondaryOpen,
    settingsActive = false,
    quickOpenActive = false,
    onToggleActivityBar,
    onToggleExplorer,
    onTogglePanel,
    onToggleSecondary,
    onQuickOpen,
    onOpenSettings,
  }: {
    modLabel: string;
    activityBarExpanded: boolean;
    explorerOpen: boolean;
    terminalOpen: boolean;
    secondaryOpen: boolean;
    settingsActive?: boolean;
    quickOpenActive?: boolean;
    onToggleActivityBar: () => void;
    onToggleExplorer: () => void;
    onTogglePanel: () => void;
    onToggleSecondary: () => void;
    onQuickOpen: () => void;
    onOpenSettings: () => void;
  } = $props();

  function layoutIcon(type: "activity" | "sidebar" | "panel" | "secondary" | "quick" | "settings") {
    if (type === "activity") return "M2.5 3h13v12H2.5zm4 0v12M4.5 6h.01M4.5 9h.01M4.5 12h.01";
    if (type === "sidebar") return "M2.5 3h13v12H2.5V3zm4.5 0v12";
    if (type === "panel") return "M2.5 3h13v12H2.5V3zm0 7.5h13";
    if (type === "secondary") return "M2.5 3h13v12H2.5V3zm8.5 0v12";
    if (type === "quick") return "M8 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm3.5 7L15 13.5";
    return "M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2M4.4 4.4l1.4 1.4M12.2 12.2l1.4 1.4M4.4 13.6l1.4-1.4M12.2 5.8l1.4-1.4M9 6.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z";
  }
</script>

<div class="layout-controls" role="toolbar" aria-label="Layout controls">
  <button type="button" class="layout-btn" class:active={activityBarExpanded} aria-label="Toggle Activity Bar" title="Toggle Activity Bar" onclick={onToggleActivityBar}>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d={layoutIcon("activity")} /></svg>
  </button>
  <button type="button" class="layout-btn" class:active={explorerOpen} aria-label="Toggle Explorer Side Bar" title="Toggle Explorer Side Bar ({modLabel}+B)" onclick={onToggleExplorer}>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d={layoutIcon("sidebar")} /></svg>
  </button>
  <button type="button" class="layout-btn" class:active={terminalOpen} aria-label="Toggle Panel" title={"Toggle Panel (" + modLabel + "+`)"} onclick={onTogglePanel}>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d={layoutIcon("panel")} /></svg>
  </button>
  <button type="button" class="layout-btn" class:active={secondaryOpen} aria-label="Toggle Secondary Side Bar" title="Toggle Secondary Side Bar" onclick={onToggleSecondary}>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d={layoutIcon("secondary")} /></svg>
  </button>
  <button type="button" class="layout-btn" class:active={quickOpenActive} aria-label="Quick Open" title="Quick Open ({modLabel}+P)" onclick={onQuickOpen}>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d={layoutIcon("quick")} /></svg>
  </button>
  <button type="button" class="layout-btn" class:active={settingsActive} aria-label="Settings" title="Settings" onclick={onOpenSettings}>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d={layoutIcon("settings")} /></svg>
  </button>
</div>

<style>
  .layout-controls {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 4px;
    height: var(--grok-chrome-h, 32px);
    margin: 0 8px 0 4px;
    padding: 0 2px;
    user-select: none;
    -webkit-app-region: no-drag;
    app-region: no-drag;
    position: relative;
    z-index: 20;
  }

  .layout-btn {
    width: 24px;
    height: 22px;
    min-width: 24px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: color-mix(in srgb, var(--text-dim, #c8c8d8) 78%, transparent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    transition:
      color 120ms cubic-bezier(0.22, 1, 0.36, 1),
      background 120ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 120ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 120ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .layout-btn svg {
    width: 16px;
    height: 16px;
    display: block;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.45;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .layout-btn:hover {
    color: var(--text, #f4f4f7);
    background: var(--hover, rgba(255, 255, 255, 0.08));
    border-color: var(--border-muted, rgba(255, 255, 255, 0.12));
  }

  .layout-btn.active {
    color: color-mix(in srgb, var(--accent, #8b5cf6) 78%, white 22%);
    background: color-mix(in srgb, var(--accent, #8b5cf6) 20%, transparent);
    border-color: color-mix(in srgb, var(--accent, #8b5cf6) 48%, transparent);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.13);
  }

  :global(.ide.glass-window) .layout-btn:hover {
    background: color-mix(in srgb, var(--text, #fff) 8%, transparent);
    border-color: var(--glass-border, rgba(255, 255, 255, 0.14));
  }

  :global(.ide.glass-window) .layout-btn.active {
    background: color-mix(in srgb, var(--accent, #8b5cf6) 28%, transparent);
    border-color: color-mix(in srgb, var(--accent, #8b5cf6) 52%, rgba(255, 255, 255, 0.12));
  }

  @media (max-width: 720px) {
    .layout-btn:nth-last-child(1),
    .layout-btn:nth-child(4) {
      display: none;
    }
  }
</style>
