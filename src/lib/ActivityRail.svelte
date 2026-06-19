<script lang="ts">
  export type ActivityRailItem =
    | "explorer"
    | "search"
    | "scm"
    | "agents"
    | "canvas"
    | "settings";

  let {
    activeItem = null,
    zenHidden = false,
    scmDisabled = false,
    agentBadgeCount = 0,
    onSelect,
  }: {
    activeItem?: ActivityRailItem | null;
    zenHidden?: boolean;
    scmDisabled?: boolean;
    agentBadgeCount?: number;
    onSelect: (item: ActivityRailItem) => void;
  } = $props();
</script>

<nav
  class="activity-rail liquid-glass liquid-glass-rail"
  aria-label="Activity bar"
  class:zen-hidden={zenHidden}
>
  <div class="rail-primary codex-primary-actions">
    <button
      type="button"
      class="rail-btn codex-nav-item"
      class:active={activeItem === "explorer"}
      aria-label="Explorer"
      title="Explorer"
      onclick={() => onSelect("explorer")}
    >
      <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2 4.5h4l1.1 1.2H14v6.8H2V4.5z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <button
      type="button"
      class="rail-btn codex-nav-item"
      class:active={activeItem === "search"}
      aria-label="Search"
      title="Search"
      onclick={() => onSelect("search")}
    >
      <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.25" />
        <path
          d="M10 10l3 3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <button
      type="button"
      class="rail-btn codex-nav-item"
      class:active={activeItem === "scm"}
      aria-label="Source Control"
      title="Source Control"
      disabled={scmDisabled}
      onclick={() => onSelect("scm")}
    >
      <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <circle cx="8" cy="12" r="1.5" fill="currentColor" />
        <path
          d="M4 5.5v3.5l4 2M12 5.5v3.5l-4 2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.1"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <button
      type="button"
      class="rail-btn codex-nav-item"
      class:active={activeItem === "agents"}
      aria-label="Parallel Agents"
      title="Parallel Agents"
      onclick={() => onSelect("agents")}
    >
      <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1" />
        <rect x="9" y="2" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1" />
        <rect x="2" y="9" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1" />
        <rect x="9" y="9" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1" />
      </svg>
      {#if agentBadgeCount > 0}
        <span class="rail-badge">{agentBadgeCount}</span>
      {/if}
    </button>

    <button
      type="button"
      class="rail-btn codex-nav-item"
      class:active={activeItem === "canvas"}
      aria-label="Canvas"
      title="Canvas"
      onclick={() => onSelect("canvas")}
    >
      <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.1" />
        <circle cx="5" cy="5" r="0.75" fill="currentColor" />
        <circle cx="11" cy="5" r="0.75" fill="currentColor" />
        <circle cx="5" cy="11" r="0.75" fill="currentColor" />
        <circle cx="11" cy="11" r="0.75" fill="currentColor" />
      </svg>
    </button>
  </div>

  <span class="rail-spacer" aria-hidden="true"></span>

  <button
    type="button"
    class="rail-btn codex-nav-item settings-item"
    class:active={activeItem === "settings"}
    aria-label="Settings"
    title="Settings"
    onclick={() => onSelect("settings")}
  >
    <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.25" />
      <path
        d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2M4.1 4.1l1.4 1.4M10.5 10.5l1.4 1.4M4.1 11.9l1.4-1.4M10.5 5.5l1.4-1.4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
      />
    </svg>
  </button>
</nav>

<style>
  .activity-rail {
    width: var(--grok-rail-w, var(--rail-width, 56px));
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 4px 10px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    z-index: 2;
    box-sizing: border-box;
    overflow: hidden;
    contain: paint;
    isolation: isolate;
  }

  .rail-primary {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }

  .rail-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    min-height: 40px;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    font-family: inherit;
    transition: color 0.12s ease, background 0.12s ease;
  }

  .rail-svg {
    width: 18px;
    height: 18px;
    display: block;
    flex-shrink: 0;
    opacity: 0.72;
    transition: opacity 0.12s;
  }

  .rail-btn:hover:not(:disabled) {
    color: var(--text);
    background: var(--hover);
  }

  .rail-btn:hover:not(:disabled) .rail-svg,
  .rail-btn.active .rail-svg {
    opacity: 1;
  }

  .rail-btn.active {
    color: var(--text);
    background: var(--active);
  }

  .rail-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .rail-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 14px;
    height: 14px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 9px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .rail-spacer {
    flex: 1;
    min-height: 8px;
  }
</style>