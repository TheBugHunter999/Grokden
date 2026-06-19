<script lang="ts">
  import { onMount } from "svelte";
  import type { AgentModePreset } from "$lib/editor-utils";
  import {
    APP_DISPLAY_NAME,
    WELCOME_TAGLINE,
    RECENT_WORKSPACES_STORAGE_KEY,
  } from "$lib/branding";

  export type RecentWorkspace = {
    path: string;
    name: string;
    lastOpened?: number;
  };

  export type WelcomeThemeId = "default-dark" | "glass" | "high-contrast";

  type Props = {
    onOpenFolder: () => void;
    onOpenTerminal: () => void;
    onLaunchAgents: () => void;
    onOpenCanvas: () => void;
    onCommandSubmit: (command: string) => void;
    onApplyTheme: (themeId: WelcomeThemeId) => void;
    recentWorkspaces?: RecentWorkspace[];
  };

  let {
    onOpenFolder,
    onOpenTerminal,
    onLaunchAgents,
    onOpenCanvas,
    onCommandSubmit,
    onApplyTheme,
    recentWorkspaces = [],
  }: Props = $props();

  let commandText = $state("");
  let commandInput = $state<HTMLInputElement | null>(null);
  let selectedAgentPreset = $state<AgentModePreset>("agent-driven");
  let storedWorkspaces = $state<RecentWorkspace[]>([]);
  let showQuickMenu = $state(false);
  let showModeMenu = $state(false);

  const agentPresets: {
    id: AgentModePreset;
    title: string;
    caption: string;
    badge?: string;
  }[] = [
    { id: "strict", title: "Strict", caption: "Ask before every action" },
    {
      id: "review-driven",
      title: "Review-driven",
      caption: "Frequent checkpoints",
      badge: "Recommended",
    },
    { id: "agent-driven", title: "Agent-driven", caption: "Fewer interruptions" },
    { id: "custom", title: "Custom", caption: "Tune policies yourself" },
  ];

  const modeLabel = $derived(
    selectedAgentPreset === "agent-driven"
      ? "Heavy"
      : (agentPresets.find((p) => p.id === selectedAgentPreset)?.title ?? "Heavy"),
  );

  const themePreviews: {
    id: WelcomeThemeId;
    label: string;
    frame: string;
    sidebar: string;
    editor: string;
    accent: string;
    glass?: boolean;
  }[] = [
    {
      id: "default-dark",
      label: "Default Dark",
      frame: "#2d2d2b",
      sidebar: "#211b26",
      editor: "#2b2b29",
      accent: "#cc7d5e",
    },
    {
      id: "glass",
      label: "Glass",
      frame: "rgba(24, 28, 36, 0.55)",
      sidebar: "rgba(17, 22, 30, 0.62)",
      editor: "rgba(15, 19, 26, 0.48)",
      accent: "#5cc9c7",
      glass: true,
    },
    {
      id: "high-contrast",
      label: "High-Contrast",
      frame: "#000000",
      sidebar: "#0a0a0a",
      editor: "#050505",
      accent: "#ffffff",
    },
  ];

  const emptyExamples = [
    { label: "Open a sample folder", id: "open-folder" },
    { label: "Clone a repository", id: "clone-repo" },
    { label: "Launch parallel agents", id: "launch-agent" },
  ] as const;

  const quickChips = [
    { label: "Open folder", id: "open-folder" },
    { label: "Clone repo", id: "clone-repo" },
    { label: "New canvas", id: "new-canvas" },
    { label: "Launch agent", id: "launch-agent" },
    { label: "Open terminal", id: "open-terminal" },
  ] as const;

  function runQuickAction(id: (typeof quickChips)[number]["id"]) {
    switch (id) {
      case "open-folder":
        onOpenFolder();
        break;
      case "clone-repo":
        onCommandSubmit("git clone");
        break;
      case "new-canvas":
        onOpenCanvas();
        break;
      case "launch-agent":
        onLaunchAgents();
        break;
      case "open-terminal":
        onOpenTerminal();
        break;
    }
  }

  const effectiveWorkspaces = $derived(
    recentWorkspaces.length > 0 ? recentWorkspaces : storedWorkspaces,
  );

  function loadStoredWorkspaces(): RecentWorkspace[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(RECENT_WORKSPACES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecentWorkspace[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function submitCommand() {
    const trimmed = commandText.trim();
    if (!trimmed) return;
    onCommandSubmit(trimmed);
    commandText = "";
  }

  function handleCommandKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitCommand();
    }
  }

  function openWorkspace(workspace: RecentWorkspace) {
    onCommandSubmit(`open ${workspace.path}`);
  }

  function formatLastOpened(timestamp?: number): string {
    if (!timestamp) return "Recently opened";
    const delta = Date.now() - timestamp;
    const minutes = Math.floor(delta / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  onMount(() => {
    storedWorkspaces = loadStoredWorkspaces();
    commandInput?.focus();
  });
</script>

<div class="grok-welcome welcome-stage">
  <div class="ambient-grid" aria-hidden="true"></div>
  <div class="ambient-vignette" aria-hidden="true"></div>

  <div class="welcome-center grok-welcome__shell">
    <div class="welcome-stage__utilities">
      <button type="button" class="welcome-stage__util" onclick={onLaunchAgents}>Parallel</button>
      <span class="welcome-stage__private">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
          <rect x="4" y="7" width="8" height="7" rx="1" />
          <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
        </svg>
        Private
      </span>
    </div>

    <div class="welcome-supergrok-hero" aria-label="SuperGrok Heavy">
      <span class="welcome-supergrok-word">SuperGrok</span>
      <span class="welcome-supergrok-badge">HEAVY</span>
    </div>

    <div class="cmdbar glass glass--pill" role="search">
      <button
        type="button"
        class="cmdbar__plus"
        aria-label="Quick actions"
        aria-expanded={showQuickMenu}
        onclick={() => {
          showQuickMenu = !showQuickMenu;
          showModeMenu = false;
        }}
      >+</button>

      {#if showQuickMenu}
        <div class="cmdbar__menu glass" role="menu">
          {#each quickChips as chip}
            <button
              type="button"
              class="cmdbar__menu-item"
              role="menuitem"
              onclick={() => {
                runQuickAction(chip.id);
                showQuickMenu = false;
              }}
            >{chip.label}</button>
          {/each}
        </div>
      {/if}

      <input
        bind:this={commandInput}
        class="cmdbar__input"
        type="text"
        placeholder="How can I help you today?"
        bind:value={commandText}
        onkeydown={handleCommandKeydown}
        aria-label="Command"
      />

      <div class="cmdbar__right">
        <button
          type="button"
          class="cmdbar__mode"
          aria-haspopup="listbox"
          aria-expanded={showModeMenu}
          onclick={() => {
            showModeMenu = !showModeMenu;
            showQuickMenu = false;
          }}
        >
          {modeLabel} <span class="chev">▾</span>
        </button>

        {#if showModeMenu}
          <div class="cmdbar__menu cmdbar__menu--mode glass" role="listbox">
            {#each agentPresets as preset}
              <button
                type="button"
                class="cmdbar__menu-item"
                class:cmdbar__menu-item--active={selectedAgentPreset === preset.id}
                role="option"
                aria-selected={selectedAgentPreset === preset.id}
                onclick={() => {
                  selectedAgentPreset = preset.id;
                  showModeMenu = false;
                }}
              >{preset.id === "agent-driven" ? "Heavy" : preset.title}</button>
            {/each}
          </div>
        {/if}

        <button class="cmdbar__icon" title="Voice input — coming soon" disabled aria-label="Voice input">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke-linecap="round" />
          </svg>
        </button>

        <button class="cmdbar__voice" title="Voice input — coming soon" disabled aria-label="Voice waveform">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="4" y="9" width="2" height="6" rx="1" />
            <rect x="8" y="6" width="2" height="12" rx="1" />
            <rect x="12" y="8" width="2" height="8" rx="1" />
            <rect x="16" y="5" width="2" height="14" rx="1" />
          </svg>
        </button>
      </div>
    </div>

    <p class="welcome-title grok-welcome__tagline">{WELCOME_TAGLINE}</p>

    <section class="grok-welcome__section" aria-labelledby="grok-welcome-recent-heading">
      <div class="grok-welcome__section-head">
        <h2 id="grok-welcome-recent-heading" class="grok-welcome__section-title">Recent workspaces</h2>
      </div>
      {#if effectiveWorkspaces.length > 0}
        <ul class="grok-welcome__workspace-list">
          {#each effectiveWorkspaces as workspace (workspace.path)}
            <li>
              <button
                type="button"
                class="grok-welcome__workspace-row liquid-glass"
                onclick={() => openWorkspace(workspace)}
              >
                <span class="grok-welcome__workspace-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16">
                    <path d="M2 5h4l1.1 1.2H14v6.3H2V5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
                  </svg>
                </span>
                <span class="grok-welcome__workspace-meta">
                  <span class="grok-welcome__workspace-name">{workspace.name}</span>
                  <span class="grok-welcome__workspace-path">{workspace.path}</span>
                </span>
                <span class="grok-welcome__workspace-time">{formatLastOpened(workspace.lastOpened)}</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="grok-welcome__empty">
          <p class="grok-welcome__empty-copy">No recent workspaces yet. Try one of these to get started:</p>
          <div class="grok-welcome__empty-actions">
            {#each emptyExamples as example}
              <button type="button" class="grok-welcome__empty-btn" onclick={() => runQuickAction(example.id)}>
                {example.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </section>

    <section class="grok-welcome__section" aria-labelledby="grok-welcome-agents-heading">
      <div class="grok-welcome__section-head">
        <h2 id="grok-welcome-agents-heading" class="grok-welcome__section-title">Agent presets</h2>
      </div>
      <div class="grok-welcome__agent-row" role="group" aria-label="Agent presets">
        {#each agentPresets as preset}
          <button
            type="button"
            class="grok-welcome__agent-card"
            class:grok-welcome__agent-card--selected={selectedAgentPreset === preset.id}
            aria-pressed={selectedAgentPreset === preset.id}
            onclick={() => (selectedAgentPreset = preset.id)}
          >
            {#if preset.badge}
              <span class="grok-welcome__agent-badge">{preset.badge}</span>
            {/if}
            <span class="grok-welcome__agent-title">{preset.title}</span>
            <span class="grok-welcome__agent-caption">{preset.caption}</span>
          </button>
        {/each}
      </div>
    </section>

    <section class="grok-welcome__section" aria-labelledby="grok-welcome-themes-heading">
      <div class="grok-welcome__section-head">
        <h2 id="grok-welcome-themes-heading" class="grok-welcome__section-title">Themes</h2>
      </div>
      <div class="grok-welcome__theme-row">
        {#each themePreviews as theme}
          <article class="grok-welcome__theme-card">
            <div
              class="grok-welcome__theme-preview"
              class:grok-welcome__theme-preview--glass={theme.glass}
              style:--grok-theme-frame={theme.frame}
              style:--grok-theme-side={theme.sidebar}
              style:--grok-theme-editor={theme.editor}
              style:--grok-theme-accent={theme.accent}
            >
              <span class="grok-welcome__theme-bar"></span>
              <span class="grok-welcome__theme-side"></span>
              <span class="grok-welcome__theme-editor">
                <span class="grok-welcome__theme-line"></span>
                <span class="grok-welcome__theme-line grok-welcome__theme-line--short"></span>
                <span class="grok-welcome__theme-line grok-welcome__theme-line--accent"></span>
              </span>
            </div>
            <div class="grok-welcome__theme-footer">
              <span class="grok-welcome__theme-label">{theme.label}</span>
              <button
                type="button"
                class="grok-welcome__theme-apply"
                onclick={() => onApplyTheme(theme.id)}
              >
                Apply
              </button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  </div>
</div>