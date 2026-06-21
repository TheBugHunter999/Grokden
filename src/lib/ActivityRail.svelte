<script lang="ts">
  import { APP_DISPLAY_NAME } from "$lib/branding";

  export type ActivityRailItem =
    | "home"
    | "explorer"
    | "search"
    | "scm"
    | "agents"
    | "canvas"
    | "settings"
    | "skills"
    | "memory";

  export type SidebarSelectItem = ActivityRailItem;

  let {
    activeItem = null,
    zenHidden = false,
    scmDisabled = false,
    agentBadgeCount = 0,
    collapsed = false,
    appVersion = "",
    onSelect,
    onOpenTerminal,
    onOpenFolder,
    onToggleCollapse,
  }: {
    activeItem?: SidebarSelectItem | null;
    zenHidden?: boolean;
    scmDisabled?: boolean;
    agentBadgeCount?: number;
    collapsed?: boolean;
    appVersion?: string;
    onSelect: (item: SidebarSelectItem) => void;
    onOpenTerminal: () => void;
    onOpenFolder: () => void;
    onToggleCollapse: () => void;
  } = $props();

  let projectsOpen = $state(true);
  let historyOpen = $state(true);

  const userInitials = $derived(
    APP_DISPLAY_NAME.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G",
  );
</script>

<nav
  class="sidebar"
  class:collapsed={collapsed}
  class:zen-hidden={zenHidden}
  aria-label="Main navigation"
>
  <div class="brand">
    <span class="glyph" aria-hidden="true">G</span>
    {#if !collapsed}
      <span class="wordmark">{APP_DISPLAY_NAME}</span>
      {#if appVersion}
        <span class="version">v{appVersion}</span>
      {/if}
    {/if}
    <button
      type="button"
      class="collapse-btn"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onclick={onToggleCollapse}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        {#if collapsed}
          <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
        {:else}
          <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        {/if}
      </svg>
    </button>
  </div>

  <div class="scroll">
    <button
      type="button"
      class="row"
      class:active={activeItem === "home"}
      onclick={() => onSelect("home")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="label">Home</span>
    </button>

    <button
      type="button"
      class="row"
      class:active={activeItem === "search"}
      onclick={() => onSelect("search")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
      </svg>
      <span class="label">Search</span>
    </button>

    <div class="eyebrow">Primary</div>

    <button type="button" class="row" onclick={onOpenTerminal}>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <polyline points="7 9 10 12 7 15" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="13" y1="15" x2="17" y2="15" stroke-linecap="round" />
      </svg>
      <span class="label">Terminal</span>
    </button>

    <button
      type="button"
      class="row"
      class:active={activeItem === "agents"}
      onclick={() => onSelect("agents")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
      <span class="label">Parallel Agents</span>
      {#if agentBadgeCount > 0}
        <span class="agent-badge">{agentBadgeCount}</span>
      {/if}
    </button>

    <button
      type="button"
      class="row"
      class:active={activeItem === "canvas"}
      onclick={() => onSelect("canvas")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <line x1="8" y1="7" x2="15.5" y2="8" />
        <line x1="10" y1="15" x2="14" y2="10" />
      </svg>
      <span class="label">Canvas</span>
    </button>

    <button
      type="button"
      class="row"
      class:active={activeItem === "skills"}
      onclick={() => onSelect("skills")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="4" y="4" width="8" height="8" rx="1.5" />
        <rect x="12" y="12" width="8" height="8" rx="1.5" />
        <path d="M12 8h2.5a2.5 2.5 0 0 1 0 5H12" stroke-linecap="round" />
      </svg>
      <span class="label">Skills &amp; Connectors</span>
      <span class="soon-pill">Soon</span>
    </button>

    <div class="eyebrow">Memory</div>

    <button
      type="button"
      class="row"
      class:active={activeItem === "memory"}
      onclick={() => onSelect("memory")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="7" stroke-dasharray="3 3" />
        <circle cx="12" cy="12" r="10" stroke-dasharray="2 4" opacity="0.5" />
        <line x1="12" y1="2" x2="12" y2="5" stroke-linecap="round" />
        <line x1="12" y1="19" x2="12" y2="22" stroke-linecap="round" />
        <line x1="2" y1="12" x2="5" y2="12" stroke-linecap="round" />
        <line x1="19" y1="12" x2="22" y2="12" stroke-linecap="round" />
      </svg>
      <span class="label">Memory Galaxy</span>
    </button>

    <div class="eyebrow">Workspace</div>

    <button
      type="button"
      class="row"
      class:active={activeItem === "explorer"}
      onclick={() => onSelect("explorer")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M3 7h6l2 2h10v10H3V7z" stroke-linejoin="round" />
      </svg>
      <span class="label">Explorer</span>
    </button>

    <button
      type="button"
      class="row"
      class:active={activeItem === "scm"}
      disabled={scmDisabled}
      onclick={() => onSelect("scm")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="M6 8v4l6 4M18 8v4l-6 4" stroke-linecap="round" />
      </svg>
      <span class="label">Source Control</span>
    </button>

    <div class="section">
      <button
        type="button"
        class="section-head"
        aria-expanded={projectsOpen}
        onclick={() => (projectsOpen = !projectsOpen)}
      >
        <span>Projects</span>
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      {#if projectsOpen}
        <button type="button" class="row" onclick={onOpenFolder}>
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <line x1="12" y1="6" x2="12" y2="18" stroke-linecap="round" />
            <line x1="6" y1="12" x2="18" y2="12" stroke-linecap="round" />
          </svg>
          <span class="label">New Project</span>
        </button>
      {/if}
    </div>

    <div class="section">
      <button
        type="button"
        class="section-head"
        aria-expanded={historyOpen}
        onclick={() => (historyOpen = !historyOpen)}
      >
        <span>History</span>
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      {#if historyOpen}
        <p class="history-empty">No history yet</p>
      {/if}
    </div>
  </div>

  <div class="footer">
    <button
      type="button"
      class="row"
      class:active={activeItem === "settings"}
      onclick={() => onSelect("settings")}
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke-linecap="round" />
      </svg>
      <span class="label">Settings</span>
    </button>

    <div class="user">
      <span class="avatar" aria-hidden="true">{userInitials}</span>
      <div class="user-meta">
        <span class="user-name">{APP_DISPLAY_NAME}</span>
        <span class="user-email">workspace@grokden.local</span>
      </div>
    </div>
  </div>
</nav>

<style>
  .sidebar {
    width: 248px;
    flex: 0 0 248px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    z-index: 2;
    contain: paint;
    isolation: isolate;
    transition:
      width 320ms cubic-bezier(0.22, 1, 0.36, 1),
      flex-basis 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .sidebar.collapsed {
    width: 56px;
    flex-basis: 56px;
  }

  .sidebar.zen-hidden {
    display: none;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 10px 10px;
    flex-shrink: 0;
  }

  .sidebar.collapsed .brand {
    justify-content: center;
    padding-inline: 6px;
    flex-wrap: wrap;
  }

  .glyph {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .wordmark {
    font-size: 14px;
    font-weight: 650;
    letter-spacing: -0.03em;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .version {
    font-size: 10px;
    color: var(--text-mute);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .collapse-btn {
    margin-left: auto;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--radius-md, 11px);
    background: transparent;
    color: var(--text-mute);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, color 120ms ease;
  }

  .sidebar.collapsed .collapse-btn {
    margin-left: 0;
  }

  .collapse-btn:hover {
    background: var(--hover);
    color: var(--text);
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .eyebrow {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-mute);
    padding: 12px 10px 4px;
  }

  .sidebar.collapsed .eyebrow,
  .sidebar.collapsed .label,
  .sidebar.collapsed .section,
  .sidebar.collapsed .soon-pill,
  .sidebar.collapsed .user-meta,
  .sidebar.collapsed .wordmark,
  .sidebar.collapsed .version,
  .sidebar.collapsed .history-empty {
    display: none;
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-md, 11px);
    background: transparent;
    color: var(--text-dim);
    font-size: 13px;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }

  .sidebar.collapsed .row {
    justify-content: center;
    padding: 0;
    width: 40px;
    margin: 0 auto;
  }

  .row:hover {
    background: var(--hover);
    color: var(--text);
  }

  .row.active {
    background: var(--active);
    color: var(--text);
  }

  .row.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 2px;
    border-radius: 2px;
    background: var(--accent);
  }

  .sidebar.collapsed .row.active::before {
    display: none;
  }

  .row:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .agent-badge {
    font-size: 9px;
    font-weight: 600;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--radius-pill, 999px);
    background: var(--accent);
    color: var(--on-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .soon-pill {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: var(--radius-pill, 999px);
    background: var(--warn-soft);
    color: var(--warn);
    flex-shrink: 0;
  }

  .section {
    margin-top: 6px;
  }

  .section-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }

  .chev {
    margin-left: auto;
    font-size: 10px;
    color: var(--text-mute);
    transition: transform 120ms ease;
  }

  .section-head[aria-expanded="false"] .chev {
    transform: rotate(-90deg);
  }

  .history-empty {
    padding: 6px 10px 10px;
    font-size: 12px;
    color: var(--text-mute);
    margin: 0;
  }

  .footer {
    flex-shrink: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-top: 1px solid var(--border-muted, var(--border));
  }

  .user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-md, 11px);
  }

  .sidebar.collapsed .user {
    justify-content: center;
    padding: 8px 4px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--hover-strong, var(--hover));
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .user-meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .user-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 11px;
    color: var(--text-mute);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar,
    .row,
    .collapse-btn,
    .chev {
      transition: none;
    }
  }
</style>
