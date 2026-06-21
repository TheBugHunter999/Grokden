<script lang="ts">
  import { onMount } from "svelte";
  import type { AgentModePreset } from "$lib/editor-utils";
  import {
    APP_DISPLAY_NAME,
    loadRecentWorkspaces,
    WELCOME_TAGLINE,
  } from "$lib/branding";

  export type RecentWorkspace = {
    path: string;
    name: string;
    lastOpened?: number;
  };

  export type WelcomeThemeId = "default-dark" | "high-contrast";

  type Props = {
    onOpenFolder: () => void;
    onOpenTerminal: () => void;
    onLaunchAgents: (preset: AgentModePreset) => void;
    onAgentPresetChange?: (preset: AgentModePreset) => void;
    onOpenCanvas: () => void;
    onCommandSubmit: (command: string) => void;
    onApplyTheme: (themeId: WelcomeThemeId) => void;
    agentModePreset?: AgentModePreset;
    recentWorkspaces?: RecentWorkspace[];
  };

  let {
    onOpenFolder,
    onOpenTerminal,
    onLaunchAgents,
    onAgentPresetChange,
    onOpenCanvas,
    onCommandSubmit,
    onApplyTheme,
    agentModePreset = "agent-driven",
    recentWorkspaces = [],
  }: Props = $props();

  let selectedAgentPreset = $state<AgentModePreset>("agent-driven");
  let storedWorkspaces = $state<RecentWorkspace[]>([]);
  let showQuickMenu = $state(false);
  let showModeMenu = $state(false);
  let starred = $state(false);
  let starReact = $state(false);
  let starMessage = $state("");
  let launchAnim = $state(false);
  let previewThemeId = $state<WelcomeThemeId>("default-dark");

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
    subtitle: string;
    frame: string;
    sidebar: string;
    editor: string;
    accent: string;
  }[] = [
    {
      id: "default-dark",
      label: "Premium Grok",
      subtitle: "Obsidian surfaces, crisp neutral accents",
      frame: "#0a0a0e",
      sidebar: "#0e0e12",
      editor: "#08080c",
      accent: "#e7e7ea",
    },
    {
      id: "high-contrast",
      label: "Midnight",
      subtitle: "Pure black, precise graphite contrast",
      frame: "#000000",
      sidebar: "#050505",
      editor: "#030303",
      accent: "#f2f2f2",
    },
  ];

  const previewTheme = $derived(
    themePreviews.find((theme) => theme.id === previewThemeId) ?? themePreviews[0],
  );

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

  function selectAgentPreset(preset: AgentModePreset) {
    selectedAgentPreset = preset;
    onAgentPresetChange?.(preset);
  }

  function launchParallelAgents() {
    onLaunchAgents(selectedAgentPreset);
  }

  $effect(() => {
    selectedAgentPreset = agentModePreset;
  });

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
        launchParallelAgents();
        break;
      case "open-terminal":
        onOpenTerminal();
        break;
    }
  }

  const effectiveWorkspaces = $derived(
    recentWorkspaces.length > 0 ? recentWorkspaces : storedWorkspaces,
  );

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

  function handleStartWorkspace() {
    launchAnim = true;
    setTimeout(() => {
      launchAnim = false;
      onOpenFolder();
    }, 900);
  }

  function handleStarToggle(next: boolean) {
    starred = next;
    try {
      localStorage.setItem("Grokden.workspace.starred", next ? "1" : "0");
    } catch (_) {
      // The animation still works when storage is unavailable.
    }
    starMessage = next
      ? "Workspace achieved escape velocity."
      : "Workspace returned to a responsible orbit.";
    starReact = false;
    requestAnimationFrame(() => {
      starReact = true;
      window.setTimeout(() => (starReact = false), 980);
    });
    window.setTimeout(() => (starMessage = ""), 2400);
  }

  onMount(() => {
    storedWorkspaces = loadRecentWorkspaces();
    try {
      starred = localStorage.getItem("Grokden.workspace.starred") === "1";
    } catch (_) {
      starred = false;
    }
  });
</script>

<div class="grok-welcome welcome-stage">
  <div class="ambient-grid" aria-hidden="true"></div>
  <div class="ambient-vignette" aria-hidden="true"></div>

  <div class="welcome-center grok-welcome__shell">
    <div class="welcome-supergrok-hero" class:launch-react={launchAnim} class:star-react={starReact} aria-label="SuperGrok Heavy">
      <span class="welcome-supergrok-word">SuperGrok</span>
      <span class="welcome-supergrok-badge">HEAVY</span>
      <!-- StarToggle (adapted from Button.svelte sparkle bookmark) -->
      <div class="star-toggle">
        <input
          class="star-toggle__input"
          id="star-fav"
          type="checkbox"
          checked={starred}
          aria-label={starred ? "Unstar workspace" : "Star this workspace"}
          onchange={(event) => handleStarToggle(event.currentTarget.checked)}
        />
        <label class="star-toggle__label" for="star-fav">
          <div class="star-toggle__icon">
            <span style="--sw:2;--sd:25;--ss:11" class="star-toggle__sparkle"></span>
            <span style="--sw:1;--sd:100;--ss:18" class="star-toggle__sparkle"></span>
            <span style="--sw:1;--sd:280;--ss:5" class="star-toggle__sparkle"></span>
            <span style="--sw:2;--sd:200;--ss:3" class="star-toggle__sparkle"></span>
            <span style="--sw:2;--sd:30;--ss:20" class="star-toggle__sparkle"></span>
            <span style="--sw:1;--sd:250;--ss:4" class="star-toggle__sparkle"></span>
            <span style="--sw:2;--sd:210;--ss:8" class="star-toggle__sparkle"></span>
            <span style="--sw:1;--sd:100;--ss:9" class="star-toggle__sparkle"></span>
            <span style="--sw:2;--sd:135;--ss:9" class="star-toggle__sparkle"></span>
            <span style="--sw:2;--sd:45;--ss:4" class="star-toggle__sparkle"></span>
            <span style="--sw:1;--sd:78;--ss:16" class="star-toggle__sparkle"></span>
            <span style="--sw:2;--sd:97;--ss:1" class="star-toggle__sparkle"></span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" class="star-toggle__star-icon">
              <path d="M0.96233 28.61C1.36043 29.0081 1.96007 29.1255 2.47555 28.8971L10.4256 25.3552C13.2236 24.11 16.4254 24.1425 19.2107 25.4401L27.4152 29.2747C27.476 29.3044 27.5418 29.3023 27.6047 29.32C27.6563 29.3348 27.7079 29.3497 27.761 29.3574C27.843 29.3687 27.9194 29.3758 28 29.3688C28.1273 29.3617 28.2531 29.3405 28.3726 29.2945C28.4447 29.262 28.5162 29.2287 28.5749 29.1842C28.6399 29.1446 28.6993 29.0994 28.7509 29.0477L28.9008 28.8582C28.9468 28.7995 28.9793 28.7274 29.0112 28.656C29.0599 28.5322 29.0811 28.4036 29.0882 28.2734C29.0939 28.1957 29.0868 28.1207 29.0769 28.0415C29.0705 27.9955 29.0585 27.9524 29.0472 27.9072C29.0295 27.8343 29.0302 27.7601 28.9984 27.6901L25.1638 19.4855C23.8592 16.7073 23.8273 13.5048 25.0726 10.7068L28.6145 2.75679C28.8429 2.24131 28.7318 1.63531 28.3337 1.2372C27.9165 0.820011 27.271 0.721743 26.7491 0.9961L19.8357 4.59596C16.8418 6.15442 13.2879 6.18696 10.2615 4.70062L1.80308 0.520214C1.7055 0.474959 1.60722 0.441742 1.50964 0.421943C1.44459 0.409215 1.37882 0.395769 1.3074 0.402133C1.14406 0.395769 0.981436 0.428275 0.818095 0.499692C0.77284 0.519491 0.719805 0.545671 0.67455 0.578198C0.596061 0.617088 0.524653 0.675786 0.4596 0.74084C0.394546 0.805894 0.335843 0.877306 0.296245 0.956502C0.263718 1.00176 0.237561 1.05477 0.217762 1.10003C0.152708 1.24286 0.126545 1.40058 0.120181 1.54978C0.120181 1.61483 0.126527 1.6735 0.132891 1.73219C0.15269 1.85664 0.178881 1.97332 0.237571 2.08434L4.41798 10.5427C5.91139 13.5621 5.8725 17.1238 4.3204 20.1099L0.720514 27.0233C0.440499 27.5536 0.545137 28.1928 0.96233 28.61Z"></path>
            </svg>
          </div>
        </label>
      </div>
    </div>
    {#if starMessage}
      <div class="star-toast" role="status">{starMessage}</div>
    {/if}

    <div class="cmdbar cmdbar--pill" aria-label="Welcome actions">
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
        <div class="cmdbar__menu" role="menu">
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
        class="cmdbar__input"
        type="text"
        placeholder="How can I help you today?"
        readonly
        tabindex="-1"
        aria-disabled="true"
        aria-label="Welcome prompt preview"
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
          <div class="cmdbar__menu cmdbar__menu--mode" role="listbox">
            {#each agentPresets as preset}
              <button
                type="button"
                class="cmdbar__menu-item"
                class:cmdbar__menu-item--active={selectedAgentPreset === preset.id}
                role="option"
                aria-selected={selectedAgentPreset === preset.id}
                onclick={() => {
                  selectAgentPreset(preset.id);
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

    <!-- Themes section (moved up for visibility) -->
    <section class="grok-welcome__section grok-welcome__section--themes" aria-labelledby="grok-welcome-themes-heading">
      <div class="grok-welcome__section-head">
        <h2 id="grok-welcome-themes-heading" class="grok-welcome__section-title">Themes</h2>
      </div>
      <div class="grok-welcome__theme-row">
        {#each themePreviews as theme}
          <article class="grok-welcome__theme-card">
            <div
              class="grok-welcome__theme-preview"
              style:--grok-theme-frame={theme.frame}
              style:--grok-theme-side={theme.sidebar}
              style:--grok-theme-editor={theme.editor}
              style:--grok-theme-accent={theme.accent}
            >
              <span class="grok-welcome__theme-bar">
                <span class="grok-welcome__theme-dot" style="background: #ff5f57"></span>
                <span class="grok-welcome__theme-dot" style="background: #febc2e"></span>
                <span class="grok-welcome__theme-dot" style="background: #28c840"></span>
              </span>
              <span class="grok-welcome__theme-side">
                <span class="grok-welcome__theme-file"></span>
                <span class="grok-welcome__theme-file grok-welcome__theme-file--active"></span>
                <span class="grok-welcome__theme-file"></span>
              </span>
              <span class="grok-welcome__theme-editor">
                <span class="grok-welcome__theme-line"></span>
                <span class="grok-welcome__theme-line grok-welcome__theme-line--short"></span>
                <span class="grok-welcome__theme-line grok-welcome__theme-line--accent"></span>
                <span class="grok-welcome__theme-line grok-welcome__theme-line--short"></span>
              </span>
            </div>
            <div class="grok-welcome__theme-footer">
              <div class="grok-welcome__theme-info">
                <span class="grok-welcome__theme-label">{theme.label}</span>
                <span class="grok-welcome__theme-subtitle">{theme.subtitle}</span>
              </div>
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

      <!-- A composed theme stage replaces the old full-height comparison divider. -->
      {#if themePreviews.length >= 2}
        <div class="theme-stage" aria-label="Theme preview">
          <div class="theme-stage__header">
            <div>
              <span class="theme-stage__eyebrow">LIVE PREVIEW</span>
              <strong class="theme-stage__title">{previewTheme.label}</strong>
            </div>
            <div class="theme-stage__switcher" role="tablist" aria-label="Preview theme">
              {#each themePreviews as theme}
                <button
                  type="button"
                  role="tab"
                  class="theme-stage__tab"
                  class:theme-stage__tab--active={previewThemeId === theme.id}
                  aria-selected={previewThemeId === theme.id}
                  onclick={() => (previewThemeId = theme.id)}
                >
                  <span class="theme-stage__swatch" style:background={theme.accent}></span>
                  {theme.label}
                </button>
              {/each}
            </div>
          </div>
          <div
            class="theme-stage__viewport"
            style:--grok-theme-frame={previewTheme.frame}
            style:--grok-theme-side={previewTheme.sidebar}
            style:--grok-theme-editor={previewTheme.editor}
            style:--grok-theme-accent={previewTheme.accent}
          >
            <div class="theme-stage__chrome">
              <span class="theme-stage__traffic"><i></i><i></i><i></i></span>
              <span class="theme-stage__path">grokden / workspace</span>
              <span class="theme-stage__ready">READY</span>
            </div>
            <div class="theme-stage__body">
              <aside class="theme-stage__sidebar">
                <span class="theme-stage__section">WORKSPACE</span>
                <span class="theme-stage__file theme-stage__file--active">src</span>
                <span class="theme-stage__file">agents</span>
                <span class="theme-stage__file">memory</span>
              </aside>
              <div class="theme-stage__editor">
                <div class="theme-stage__editor-top">
                  <span>orchestrator.ts</span>
                  <span>Composer 2.5 Fast</span>
                </div>
                <div class="theme-stage__code">
                  <span><b>01</b><em>const</em> workspace = createGalaxy();</span>
                  <span><b>02</b><em>await</em> workspace.connect(agents);</span>
                  <span class="theme-stage__code-accent"><b>03</b>reviewer.verify(build);</span>
                  <span><b>04</b>planner.handoff({'{'} status: "ready" {'}'});</span>
                </div>
                <div class="theme-stage__terminal">
                  <span class="theme-stage__prompt">›</span>
                  <span>Three agents connected · waiting for launch</span>
                </div>
              </div>
            </div>
          </div>
          <div class="theme-stage__footer">
            <span>{previewTheme.subtitle}</span>
            <button type="button" onclick={() => onApplyTheme(previewTheme.id)}>Use {previewTheme.label}</button>
          </div>
        </div>
      {/if}
    </section>

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
                class="grok-welcome__workspace-row"
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
          <!-- StartButton (adapted from StartButton.svelte cyberpunk grid button) -->
          <button type="button" class="start-btn" onclick={handleStartWorkspace}>
            Start
          </button>
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
            onclick={() => selectAgentPreset(preset.id)}
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

  </div>
</div>

<style>
  /* ── StarToggle (sparkle bookmark from Button.svelte) ── */
  .star-toggle {
    position: absolute;
    top: 0;
    right: -50px;
    z-index: 10;
  }
  .star-toggle__input { display: none; }
  .star-toggle__label {
    --gap: 3px;
    --width: 28px;
    cursor: pointer;
    position: relative;
    display: inline-block;
    padding: 0.3rem;
    width: calc((var(--width) + var(--gap)) * 2);
    height: 30px;
    background-color: #121212;
    border: 1px solid #555;
    border-bottom: 0;
    border-radius: 9999px;
    box-sizing: content-box;
    transition: all 0.3s ease-in-out;
  }
  .star-toggle__label::before {
    content: "";
    position: absolute;
    z-index: -10;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% + 1rem);
    height: calc(100% + 1rem);
    background-color: #414344;
    border: 1px solid #555;
    border-bottom: 0;
    border-radius: 9999px;
    transition: all 0.3s ease-in-out;
  }
  .star-toggle__label::after {
    content: "";
    position: absolute;
    z-index: -10;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 100%; height: 100%;
    background-image: radial-gradient(circle at 50% -100%, rgb(58,155,252) 0%, rgba(12,12,12,1) 80%);
    border-radius: 9999px;
  }
  .star-toggle__icon {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--width);
    height: 30px;
    background-image: radial-gradient(circle at 50% 0%, #666 0%, #414344 100%);
    border: 1px solid #aaa;
    border-bottom: 0;
    border-radius: 9999px;
    box-shadow: inset 0 -0.1rem 0.1rem #54a8fc, inset 0 0 0.3rem 0.5rem transparent;
    transition: transform 0.3s ease-in-out;
    overflow: clip;
  }
  .star-toggle__sparkle {
    position: absolute;
    top: 50%; left: 50%;
    display: block;
    width: calc(var(--sw) * 1px);
    aspect-ratio: 1;
    background-color: #d9d9d9;
    border-radius: 50%;
    transform-origin: 50% 50%;
    rotate: calc(1deg * var(--sd));
    transform: translate(-50%, -50%);
    animation: star-sparkle calc(100s / var(--ss)) linear infinite;
  }
  @keyframes star-sparkle {
    to { width: calc(var(--sw) * 0.5px); transform: translate(2000%, -50%); }
  }
  .star-toggle__star-icon {
    width: 0.75rem;
    fill: #d9d9d9;
  }
  .star-toggle:has(.star-toggle__input:checked) .star-toggle__label {
    background-color: transparent;
    border-color: #3d6970;
    border-bottom: 0;
  }
  .star-toggle:has(.star-toggle__input:checked) .star-toggle__icon {
    overflow: visible;
    background-image: radial-gradient(circle at 50% 0%, #045ab1 0%, #54a8fc 100%);
    border-color: #54a8fc;
    border-bottom: 0;
    transform: translateX(calc((var(--gap) * 2) + 100%)) rotate(-225deg);
  }
  .star-toggle:has(.star-toggle__input:checked) .star-toggle__sparkle {
    z-index: -10;
    width: calc(var(--sw) * 1.5px);
    background-color: #acacac;
  }

  .star-toast {
    margin: -4px 0 12px;
    padding: 6px 11px;
    border: 1px solid color-mix(in srgb, var(--accent, #c89650) 28%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--panel-solid, #111116) 88%, transparent);
    color: var(--text-dim, #b8b8c2);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    animation: star-toast-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes star-toast-in {
    from { opacity: 0; transform: translateY(-5px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── StartButton (cyberpunk grid from StartButton.svelte) ── */
  .start-btn {
    --main-color: rgb(46, 213, 115);
    --main-bg-color: rgba(46, 213, 116, 0.36);
    --pattern-color: rgba(46, 213, 116, 0.073);
    filter: hue-rotate(0deg);
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5rem;
    background:
      radial-gradient(circle, var(--main-bg-color) 0%, rgba(0,0,0,0) 95%),
      linear-gradient(var(--pattern-color) 1px, transparent 1px),
      linear-gradient(to right, var(--pattern-color) 1px, transparent 1px);
    background-size: cover, 15px 15px, 15px 15px;
    background-position: center center, center center, center center;
    border-image: radial-gradient(circle, var(--main-color) 0%, rgba(0,0,0,0) 100%) 1;
    border-width: 1px 0 1px 0;
    color: var(--main-color);
    padding: 0.8rem 2.5rem;
    font-weight: 700;
    font-size: 1.2rem;
    font-family: inherit;
    transition: background-size 0.2s ease-in-out;
    margin-bottom: 12px;
  }
  .start-btn:hover {
    background-size: cover, 10px 10px, 10px 10px;
  }
  .start-btn:active {
    filter: hue-rotate(250deg);
  }

  /* ── ThemeCompare slider (ported from next-app Compare component) ── */
  /* Theme stage: aligned labels and a clean segmented switcher, with no divider. */
  .theme-stage {
    width: min(100%, 620px);
    margin: 18px auto 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--border, #2a2a32) 82%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--panel-solid, #0d0d12) 94%, transparent);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  }

  .theme-stage__header,
  .theme-stage__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
  }

  .theme-stage__header > div:first-child {
    display: flex;
    align-items: baseline;
    gap: 9px;
    min-width: 0;
  }

  .theme-stage__eyebrow {
    color: var(--text-mute, #777782);
    font: 600 8px/1 "JetBrains Mono", monospace;
    letter-spacing: 0.16em;
  }

  .theme-stage__title {
    color: var(--text, #f2f2f5);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }

  .theme-stage__switcher {
    display: flex;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--border, #24242b);
    border-radius: 9px;
    background: var(--surface-inset, #09090d);
  }

  .theme-stage__tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 27px;
    padding: 0 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-mute, #85858f);
    font: 500 10px/1 inherit;
    cursor: pointer;
  }

  .theme-stage__tab:hover { color: var(--text, #f4f4f6); }
  .theme-stage__tab--active {
    background: var(--hover, rgba(255,255,255,0.07));
    color: var(--text, #f4f4f6);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border, #333) 70%, transparent);
  }

  .theme-stage__swatch { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
  .theme-stage__viewport { height: 220px; border-block: 1px solid var(--border, #23232a); background: var(--grok-theme-editor); }
  .theme-stage__chrome {
    display: flex;
    align-items: center;
    height: 30px;
    gap: 10px;
    padding: 0 11px;
    background: var(--grok-theme-frame);
    border-bottom: 1px solid color-mix(in srgb, var(--grok-theme-accent) 18%, transparent);
    font: 500 8px/1 "JetBrains Mono", monospace;
  }
  .theme-stage__traffic { display: flex; gap: 4px; }
  .theme-stage__traffic i { width: 6px; height: 6px; border-radius: 50%; background: #ff625c; }
  .theme-stage__traffic i:nth-child(2) { background: #f6bd3b; }
  .theme-stage__traffic i:nth-child(3) { background: #35c85a; }
  .theme-stage__path { color: rgba(220,220,232,0.55); }
  .theme-stage__ready { margin-left: auto; color: var(--grok-theme-accent); letter-spacing: 0.12em; }
  .theme-stage__body { display: grid; grid-template-columns: 126px minmax(0, 1fr); height: 190px; }
  .theme-stage__sidebar { display: flex; flex-direction: column; gap: 4px; padding: 12px 8px; background: var(--grok-theme-side); border-right: 1px solid rgba(255,255,255,0.045); }
  .theme-stage__section { padding: 0 7px 5px; color: rgba(220,220,232,0.35); font: 600 7px/1 "JetBrains Mono", monospace; letter-spacing: 0.15em; }
  .theme-stage__file { padding: 5px 8px; border-radius: 5px; color: rgba(220,220,232,0.47); font-size: 9px; }
  .theme-stage__file--active { background: color-mix(in srgb, var(--grok-theme-accent) 14%, transparent); color: rgba(245,245,250,0.82); }
  .theme-stage__editor { display: grid; grid-template-rows: 27px 1fr 34px; min-width: 0; background: var(--grok-theme-editor); }
  .theme-stage__editor-top { display: flex; align-items: center; justify-content: space-between; padding: 0 11px; border-bottom: 1px solid rgba(255,255,255,0.045); color: rgba(220,220,232,0.48); font: 500 8px/1 "JetBrains Mono", monospace; }
  .theme-stage__editor-top span:last-child { color: var(--grok-theme-accent); }
  .theme-stage__code { display: flex; flex-direction: column; gap: 8px; padding: 14px 12px; color: rgba(224,224,235,0.56); font: 9px/1.25 "JetBrains Mono", monospace; overflow: hidden; }
  .theme-stage__code span { white-space: nowrap; }
  .theme-stage__code b { display: inline-block; width: 24px; color: rgba(180,180,195,0.25); font-weight: 400; }
  .theme-stage__code em { color: var(--grok-theme-accent); font-style: normal; }
  .theme-stage__code-accent { color: color-mix(in srgb, var(--grok-theme-accent) 72%, white); }
  .theme-stage__terminal { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-top: 1px solid rgba(255,255,255,0.045); color: rgba(220,220,232,0.42); font: 8px/1 "JetBrains Mono", monospace; }
  .theme-stage__prompt { color: var(--grok-theme-accent); font-size: 13px; }
  .theme-stage__footer { color: var(--text-mute, #85858f); font-size: 10px; }
  .theme-stage__footer button { height: 28px; padding: 0 11px; border: 1px solid color-mix(in srgb, var(--accent, #c89650) 32%, var(--border, #333)); border-radius: 7px; background: var(--accent-soft, rgba(200,150,80,0.1)); color: var(--text, #f4f4f6); font: 600 10px/1 inherit; cursor: pointer; }
  .theme-stage__footer button:hover { background: color-mix(in srgb, var(--accent, #c89650) 18%, transparent); }

  @media (max-width: 620px) {
    .theme-stage__header { align-items: flex-start; flex-direction: column; }
    .theme-stage__switcher { width: 100%; }
    .theme-stage__tab { flex: 1; justify-content: center; }
    .theme-stage__body { grid-template-columns: 92px minmax(0, 1fr); }
  }

  /* ── Launch animation: SuperGrok HEAVY reacts on "Start" ── */
  .welcome-supergrok-hero.launch-react {
    animation: hero-shockwave 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .welcome-supergrok-hero.launch-react .welcome-supergrok-word {
    animation: word-flip 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .welcome-supergrok-hero.launch-react .welcome-supergrok-badge {
    animation: badge-burst 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards;
  }

  .welcome-supergrok-hero.star-react {
    transform-origin: center;
    animation: star-hero-orbit 920ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .welcome-supergrok-hero.star-react .welcome-supergrok-word {
    animation: star-word-flip 900ms cubic-bezier(0.2, 0.9, 0.2, 1.2) both;
  }
  .welcome-supergrok-hero.star-react .welcome-supergrok-badge {
    animation: star-badge-comedy 900ms cubic-bezier(0.2, 0.9, 0.2, 1.2) both;
  }

  @keyframes star-hero-orbit {
    0%, 100% { filter: none; }
    35% { filter: drop-shadow(0 0 24px color-mix(in srgb, var(--accent, #c89650) 55%, transparent)); }
  }
  @keyframes star-word-flip {
    0% { transform: perspective(800px) rotateY(0) translateY(0); }
    42% { transform: perspective(800px) rotateY(190deg) translateY(-4px) scale(1.05); }
    64% { transform: perspective(800px) rotateY(350deg) translateY(1px) scale(0.98); }
    100% { transform: perspective(800px) rotateY(360deg) translateY(0) scale(1); }
  }
  @keyframes star-badge-comedy {
    0% { transform: translateY(4px) rotate(0); }
    30% { transform: translate(5px, -9px) rotate(12deg) scale(1.16); }
    58% { transform: translate(-3px, 2px) rotate(-7deg) scale(0.94); }
    100% { transform: translateY(4px) rotate(0) scale(1); }
  }

  @keyframes hero-shockwave {
    0% { filter: drop-shadow(0 0 0 transparent); }
    30% { filter: drop-shadow(0 0 60px color-mix(in srgb, var(--grok-accent, #c89650) 45%, transparent))
                     drop-shadow(0 0 120px color-mix(in srgb, var(--grok-accent, #c89650) 20%, transparent)); }
    100% { filter: drop-shadow(0 0 0 transparent); }
  }
  @keyframes word-flip {
    0% { transform: perspective(600px) rotateX(0deg) scale(1); opacity: 1; }
    40% { transform: perspective(600px) rotateX(-15deg) scale(1.06); opacity: 0.8; }
    70% { transform: perspective(600px) rotateX(8deg) scale(0.97); opacity: 1; }
    100% { transform: perspective(600px) rotateX(0deg) scale(1); opacity: 1; }
  }
  @keyframes badge-burst {
    0% { transform: translateY(4px) scale(1); }
    35% { transform: translateY(-6px) scale(1.25); }
    60% { transform: translateY(2px) scale(0.9); }
    100% { transform: translateY(4px) scale(1); }
  }
</style>
