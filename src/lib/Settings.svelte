<script lang="ts">
  import {
    themeList,

    settingsNav,
    FONT_STACKS,
    gitDiffModes,
    grokModels,
    titleBarStyles,
    panelLocations,
    sidebarLocations,
    breakpointBehaviors,
    terminalCursorStyles,
    WINDOWS_POWERSHELL_PATH,
    type AppSettings,
  } from "$lib/editor-utils";

  let { settings = $bindable() }: { settings: AppSettings } = $props();

  let section = $state("appearance");
  let filter = $state("");
  let scrollEl = $state<HTMLDivElement | undefined>();

  $effect(() => {
    section;
    filter;
    scrollEl?.scrollTo({ top: 0 });
  });

  let sectionLabel = $derived(
    filter.trim() ? "Search Results" : settingsNav.find((s) => s.id === section)?.label ?? "Settings",
  );

  function showRow(rowSection: string, text: string): boolean {
    const f = filter.trim().toLowerCase();
    if (!f) return rowSection === section;
    return text.toLowerCase().includes(f);
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function stepFloat(value: number, delta: number, min: number, max: number): number {
    return Math.round(clamp(value + delta, min, max) * 10) / 10;
  }

  const fontOptions = Object.keys(FONT_STACKS);
  const fontLabels: Record<string, string> = {
    cascadia: "Cascadia Code",
    fira: "Fira Code",
    jetbrains: "JetBrains Mono",
    consolas: "Consolas",
  };
</script>

<div class="settings-view">
  <nav class="settings-nav">
    <div class="nav-box">
      <input class="nav-input" placeholder="Search settings..." bind:value={filter} />
    </div>
    {#each settingsNav as item (item.id)}
      <button type="button" class="nav-item" class:active={section === item.id && !filter.trim()} onclick={() => { section = item.id; filter = ""; }}>{item.label}</button>
    {/each}
  </nav>

  <div class="settings-main">
    <header class="settings-header">
      <div class="settings-tabs"><span class="st-tab active">User</span><span class="st-tab">Grokden</span></div>
      <h2 class="settings-title">{sectionLabel}</h2>
      <p class="settings-note">Preferences are saved locally on this device.</p>
    </header>

    <div class="settings-scroll dark-scrollbar" bind:this={scrollEl}>
    <div class="settings-inner">

    {#if !filter.trim() && section === "general"}<div class="group-title">General</div>{/if}
    {#if showRow("general", "Startup Behavior restore session welcome empty launch")}
      <div class="row"><div class="meta"><div class="label">Startup Behavior</div><div class="desc">What to show when Grokden launches.</div></div>
        <select class="select" bind:value={settings.startupBehavior}>
          <option value="restore">Restore Last Session</option>
          <option value="welcome">Welcome Screen</option>
          <option value="empty">Empty Window</option>
        </select></div>
    {/if}
    {#if showRow("general", "Auto Save automatically save edits typing")}
      <div class="row"><div class="meta"><div class="label">Auto Save</div><div class="desc">Automatically save edits shortly after you stop typing.</div></div>
        <button type="button" class="toggle" class:on={settings.autoSave} role="switch" aria-checked={settings.autoSave} aria-label="Auto Save" onclick={() => (settings.autoSave = !settings.autoSave)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Restore Terminal On Startup show panel launch")}
      <div class="row"><div class="meta"><div class="label">Restore Terminal On Startup</div><div class="desc">Show the terminal panel when the app launches.</div></div>
        <button type="button" class="toggle" class:on={settings.showTerminalOnStart} role="switch" aria-checked={settings.showTerminalOnStart} aria-label="Restore Terminal On Startup" onclick={() => (settings.showTerminalOnStart = !settings.showTerminalOnStart)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Auto Check Updates download install release")}
      <div class="row"><div class="meta"><div class="label">Auto Check Updates</div><div class="desc">Automatically check for and notify about new releases.</div></div>
        <button type="button" class="toggle" class:on={settings.autoCheckUpdates} role="switch" aria-checked={settings.autoCheckUpdates} aria-label="Auto Check Updates" onclick={() => (settings.autoCheckUpdates = !settings.autoCheckUpdates)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Allow Prerelease Updates beta early access")}
      <div class="row"><div class="meta"><div class="label">Allow Prerelease Updates</div><div class="desc">Include beta and preview builds when checking for updates.</div></div>
        <button type="button" class="toggle" class:on={settings.allowPrereleaseUpdates} role="switch" aria-checked={settings.allowPrereleaseUpdates} aria-label="Allow Prerelease Updates" onclick={() => (settings.allowPrereleaseUpdates = !settings.allowPrereleaseUpdates)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Telemetry usage analytics privacy data")}
      <div class="row"><div class="meta"><div class="label">Telemetry</div><div class="desc">Store anonymous usage events locally on this PC (no cloud upload). Saved under %LOCALAPPDATA%\com.grokden.desktop\telemetry.</div></div>
        <button type="button" class="toggle" class:on={settings.telemetryEnabled} role="switch" aria-checked={settings.telemetryEnabled} aria-label="Telemetry" onclick={() => (settings.telemetryEnabled = !settings.telemetryEnabled)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Crash Reports error diagnostics privacy")}
      <div class="row"><div class="meta"><div class="label">Crash Reports</div><div class="desc">Automatically send crash diagnostics when the app fails.</div></div>
        <button type="button" class="toggle" class:on={settings.crashReportsEnabled} role="switch" aria-checked={settings.crashReportsEnabled} aria-label="Crash Reports" onclick={() => (settings.crashReportsEnabled = !settings.crashReportsEnabled)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Default Open Folder workspace path directory")}
      <div class="row"><div class="meta"><div class="label">Default Open Folder</div><div class="desc">Default directory when opening a new workspace.</div></div>
        <input class="text-input" type="text" placeholder="No folder set" bind:value={settings.defaultOpenFolder} /></div>
    {/if}
    {#if showRow("general", "UI Language interface locale english")}
      <div class="row"><div class="meta"><div class="label">UI Language</div><div class="desc">Language used for menus, labels and dialogs.</div></div>
        <select class="select" bind:value={settings.uiLanguage}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Francais</option>
          <option value="es">Espanol</option>
          <option value="ja">Japanese</option>
        </select></div>
    {/if}
    {#if showRow("general", "Confirm Before Quit exit application close")}
      <div class="row"><div class="meta"><div class="label">Confirm Before Quit</div><div class="desc">Ask for confirmation before closing the application.</div></div>
        <button type="button" class="toggle" class:on={settings.confirmBeforeQuit} role="switch" aria-checked={settings.confirmBeforeQuit} aria-label="Confirm Before Quit" onclick={() => (settings.confirmBeforeQuit = !settings.confirmBeforeQuit)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("general", "Confirm Before Closing Tabs unsaved changes")}
      <div class="row"><div class="meta"><div class="label">Confirm Before Closing Tabs</div><div class="desc">Ask for confirmation before closing a tab with unsaved changes.</div></div>
        <button type="button" class="toggle" class:on={settings.confirmClose} role="switch" aria-checked={settings.confirmClose} aria-label="Confirm Before Closing Tabs" onclick={() => (settings.confirmClose = !settings.confirmClose)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "appearance"}<div class="group-title">Appearance</div>{/if}
    {#if showRow("appearance", "Theme color scheme dark light charcoal tokyo mocha grokden")}
      <div class="row col"><div class="meta"><div class="label">Theme</div><div class="desc">Choose the overall color scheme for the workspace.</div></div>
        <div class="theme-grid">
          {#each themeList as th (th.id)}
            <button type="button" class="theme-card" class:active={settings.theme === th.id} onclick={() => (settings.theme = th.id)}>
              <span class="theme-prev" style="background: {th.bg}"><span class="tp-bar" style="background: {th.text}"></span><span class="tp-dot" style="background: {th.panel}"></span></span>
              <span class="theme-name">{th.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if showRow("appearance", "Font Family editor typeface monospace")}
      <div class="row"><div class="meta"><div class="label">Font Family</div><div class="desc">Typeface used in the code editor and terminal.</div></div>
        <select class="select" bind:value={settings.fontFamily}>
          {#each fontOptions as opt (opt)}<option value={opt}>{fontLabels[opt] ?? opt}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("appearance", "Font Size editor text")}
      <div class="row"><div class="meta"><div class="label">Font Size</div><div class="desc">Font size for editor text, in pixels.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.fontSize = clamp(settings.fontSize - 1, 8, 28))}>-</button><span>{settings.fontSize}</span><button type="button" onclick={() => (settings.fontSize = clamp(settings.fontSize + 1, 8, 28))}>+</button></div></div>
    {/if}
    {#if showRow("appearance", "Line Height editor spacing")}
      <div class="row"><div class="meta"><div class="label">Line Height</div><div class="desc">Vertical spacing between editor lines, in pixels.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.lineHeight = clamp(settings.lineHeight - 1, 14, 36))}>-</button><span>{settings.lineHeight}</span><button type="button" onclick={() => (settings.lineHeight = clamp(settings.lineHeight + 1, 14, 36))}>+</button></div></div>
    {/if}
    {#if showRow("appearance", "UI Density compact comfortable spacious layout")}
      <div class="row"><div class="meta"><div class="label">UI Density</div><div class="desc">Controls spacing and padding across the interface.</div></div>
        <select class="select" bind:value={settings.uiDensity}>
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select></div>
    {/if}
    {#if showRow("appearance", "Enable Animations transitions motion effects")}
      <div class="row"><div class="meta"><div class="label">Enable Animations</div><div class="desc">Play smooth transitions for panels, tabs and menus.</div></div>
        <button type="button" class="toggle" class:on={settings.enableAnimations} role="switch" aria-checked={settings.enableAnimations} aria-label="Enable Animations" onclick={() => (settings.enableAnimations = !settings.enableAnimations)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("appearance", "Window Transparency opacity glass effect")}
      <div class="row"><div class="meta"><div class="label">Window Transparency</div><div class="desc">Opacity of the window background, as a percentage.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.windowTransparency = clamp(settings.windowTransparency - 5, 50, 100))}>-</button><span>{settings.windowTransparency}%</span><button type="button" onclick={() => (settings.windowTransparency = clamp(settings.windowTransparency + 5, 50, 100))}>+</button></div></div>
    {/if}
    {#if showRow("appearance", "Sidebar Position left right panel explorer")}
      <div class="row"><div class="meta"><div class="label">Sidebar Position</div><div class="desc">Which side of the window the primary sidebar appears on.</div></div>
        <select class="select" bind:value={settings.sidebarPosition}>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select></div>
    {/if}
    {#if showRow("appearance", "Icon Theme file icons default minimal colored")}
      <div class="row"><div class="meta"><div class="label">Icon Theme</div><div class="desc">Style of file and folder icons in the explorer.</div></div>
        <select class="select" bind:value={settings.iconTheme}>
          <option value="default">Default</option>
          <option value="minimal">Minimal</option>
          <option value="colored">Colored</option>
        </select></div>
    {/if}
    {#if showRow("appearance", "Show Breadcrumbs file path navigation")}
      <div class="row"><div class="meta"><div class="label">Show Breadcrumbs</div><div class="desc">Display the file path above the editor for quick navigation.</div></div>
        <button type="button" class="toggle" class:on={settings.showBreadcrumbs} role="switch" aria-checked={settings.showBreadcrumbs} aria-label="Show Breadcrumbs" onclick={() => (settings.showBreadcrumbs = !settings.showBreadcrumbs)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("appearance", "Smooth Scrolling editor list inertia")}
      <div class="row"><div class="meta"><div class="label">Smooth Scrolling</div><div class="desc">Use animated scrolling in the editor and lists.</div></div>
        <button type="button" class="toggle" class:on={settings.smoothScrolling} role="switch" aria-checked={settings.smoothScrolling} aria-label="Smooth Scrolling" onclick={() => (settings.smoothScrolling = !settings.smoothScrolling)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "keymap"}<div class="group-title">Keymap</div>{/if}
    {#if showRow("keymap", "Keybinding Preset default vscode sublime vim")}
      <div class="row"><div class="meta"><div class="label">Keybinding Preset</div><div class="desc">Base keyboard shortcut layout for the editor.</div></div>
        <select class="select" bind:value={settings.keybindingPreset}>
          <option value="default">Grokden Default</option>
          <option value="vscode">VS Code</option>
          <option value="sublime">Sublime Text</option>
          <option value="vim">Vim</option>
        </select></div>
    {/if}
    {#if showRow("keymap", "Chord Timeout key sequence delay milliseconds")}
      <div class="row"><div class="meta"><div class="label">Chord Timeout</div><div class="desc">Milliseconds to wait for the second key in a chord sequence.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.chordTimeout = clamp(settings.chordTimeout - 50, 100, 2000))}>-</button><span>{settings.chordTimeout}ms</span><button type="button" onclick={() => (settings.chordTimeout = clamp(settings.chordTimeout + 50, 100, 2000))}>+</button></div></div>
    {/if}
    {#if showRow("keymap", "Vim Mode modal editing hjkl")}
      <div class="row"><div class="meta"><div class="label">Vim Mode</div><div class="desc">Enable modal Vim-style editing in the code editor.</div></div>
        <button type="button" class="toggle" class:on={settings.vimMode} role="switch" aria-checked={settings.vimMode} aria-label="Vim Mode" onclick={() => (settings.vimMode = !settings.vimMode)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("keymap", "Multi-Cursor Modifier alt ctrl cmd add cursor")}
      <div class="row"><div class="meta"><div class="label">Multi-Cursor Modifier</div><div class="desc">Modifier key held while clicking to add multiple cursors.</div></div>
        <select class="select" bind:value={settings.multiCursorModifier}>
          <option value="alt">Alt</option>
          <option value="ctrl">Ctrl</option>
          <option value="cmd">Cmd</option>
        </select></div>
    {/if}
    {#if showRow("keymap", "Enable Chord Keybindings sequence two-key")}
      <div class="row"><div class="meta"><div class="label">Enable Chord Keybindings</div><div class="desc">Allow two-key chord shortcuts like Ctrl+K Ctrl+S.</div></div>
        <button type="button" class="toggle" class:on={settings.enableChordKeybindings} role="switch" aria-checked={settings.enableChordKeybindings} aria-label="Enable Chord Keybindings" onclick={() => (settings.enableChordKeybindings = !settings.enableChordKeybindings)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("keymap", "Key Repeat Delay hold repeat rate milliseconds")}
      <div class="row"><div class="meta"><div class="label">Key Repeat Delay</div><div class="desc">Delay before a held key starts repeating, in milliseconds.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.keyRepeatDelay = clamp(settings.keyRepeatDelay - 25, 100, 1000))}>-</button><span>{settings.keyRepeatDelay}ms</span><button type="button" onclick={() => (settings.keyRepeatDelay = clamp(settings.keyRepeatDelay + 25, 100, 1000))}>+</button></div></div>
    {/if}

    {#if !filter.trim() && section === "editor"}<div class="group-title">Editor</div>{/if}
    {#if showRow("editor", "Show Line Numbers gutter")}
      <div class="row"><div class="meta"><div class="label">Show Line Numbers</div><div class="desc">Display the line-number gutter in the editor.</div></div>
        <button type="button" class="toggle" class:on={settings.showLineNumbers} role="switch" aria-checked={settings.showLineNumbers} aria-label="Show Line Numbers" onclick={() => (settings.showLineNumbers = !settings.showLineNumbers)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Word Wrap soft wrap long lines")}
      <div class="row"><div class="meta"><div class="label">Word Wrap</div><div class="desc">Wrap long lines instead of scrolling horizontally.</div></div>
        <button type="button" class="toggle" class:on={settings.wordWrap} role="switch" aria-checked={settings.wordWrap} aria-label="Word Wrap" onclick={() => (settings.wordWrap = !settings.wordWrap)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Tab Size indentation spaces")}
      <div class="row"><div class="meta"><div class="label">Tab Size</div><div class="desc">Number of spaces a tab is rendered as.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.tabSize = clamp(settings.tabSize - 1, 1, 8))}>-</button><span>{settings.tabSize}</span><button type="button" onclick={() => (settings.tabSize = clamp(settings.tabSize + 1, 1, 8))}>+</button></div></div>
    {/if}
    {#if showRow("editor", "Minimap code overview scroll preview")}
      <div class="row"><div class="meta"><div class="label">Minimap</div><div class="desc">Show a scrollable preview of the file on the right edge.</div></div>
        <button type="button" class="toggle" class:on={settings.minimap} role="switch" aria-checked={settings.minimap} aria-label="Minimap" onclick={() => (settings.minimap = !settings.minimap)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Bracket Pair Colorization matching brackets highlight")}
      <div class="row"><div class="meta"><div class="label">Bracket Pair Colorization</div><div class="desc">Colorize matching bracket pairs for easier navigation.</div></div>
        <button type="button" class="toggle" class:on={settings.bracketPairColorization} role="switch" aria-checked={settings.bracketPairColorization} aria-label="Bracket Pair Colorization" onclick={() => (settings.bracketPairColorization = !settings.bracketPairColorization)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Format On Save auto format prettier")}
      <div class="row"><div class="meta"><div class="label">Format On Save</div><div class="desc">Automatically format the file when you save it.</div></div>
        <button type="button" class="toggle" class:on={settings.formatOnSave} role="switch" aria-checked={settings.formatOnSave} aria-label="Format On Save" onclick={() => (settings.formatOnSave = !settings.formatOnSave)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Ruler Column guide line width characters")}
      <div class="row"><div class="meta"><div class="label">Ruler Column</div><div class="desc">Character column at which a vertical ruler is drawn.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.rulerColumn = clamp(settings.rulerColumn - 10, 40, 200))}>-</button><span>{settings.rulerColumn}</span><button type="button" onclick={() => (settings.rulerColumn = clamp(settings.rulerColumn + 10, 40, 200))}>+</button></div></div>
    {/if}
    {#if showRow("editor", "Scroll Beyond Last Line empty space bottom")}
      <div class="row"><div class="meta"><div class="label">Scroll Beyond Last Line</div><div class="desc">Allow scrolling past the final line of the file.</div></div>
        <button type="button" class="toggle" class:on={settings.scrollBeyondLastLine} role="switch" aria-checked={settings.scrollBeyondLastLine} aria-label="Scroll Beyond Last Line" onclick={() => (settings.scrollBeyondLastLine = !settings.scrollBeyondLastLine)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Render Whitespace spaces tabs boundary all")}
      <div class="row"><div class="meta"><div class="label">Render Whitespace</div><div class="desc">When to show visible markers for spaces and tabs.</div></div>
        <select class="select" bind:value={settings.renderWhitespace}>
          <option value="none">None</option>
          <option value="boundary">Boundary</option>
          <option value="all">All</option>
        </select></div>
    {/if}
    {#if showRow("editor", "Sticky Scroll scope headers pinned top")}
      <div class="row"><div class="meta"><div class="label">Sticky Scroll</div><div class="desc">Keep enclosing scope headers visible at the top while scrolling.</div></div>
        <button type="button" class="toggle" class:on={settings.stickyScroll} role="switch" aria-checked={settings.stickyScroll} aria-label="Sticky Scroll" onclick={() => (settings.stickyScroll = !settings.stickyScroll)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Auto Closing Brackets pairs insert")}
      <div class="row"><div class="meta"><div class="label">Auto Closing Brackets</div><div class="desc">Automatically insert closing brackets and quotes.</div></div>
        <button type="button" class="toggle" class:on={settings.autoClosingBrackets} role="switch" aria-checked={settings.autoClosingBrackets} aria-label="Auto Closing Brackets" onclick={() => (settings.autoClosingBrackets = !settings.autoClosingBrackets)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Insert Spaces tab key spaces indentation")}
      <div class="row"><div class="meta"><div class="label">Insert Spaces</div><div class="desc">Pressing Tab inserts spaces instead of a tab character.</div></div>
        <button type="button" class="toggle" class:on={settings.insertSpaces} role="switch" aria-checked={settings.insertSpaces} aria-label="Insert Spaces" onclick={() => (settings.insertSpaces = !settings.insertSpaces)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("editor", "Cursor Blinking blink smooth phase solid")}
      <div class="row"><div class="meta"><div class="label">Cursor Blinking</div><div class="desc">Animation style for the text cursor.</div></div>
        <select class="select" bind:value={settings.cursorBlinking}>
          <option value="blink">Blink</option>
          <option value="smooth">Smooth</option>
          <option value="phase">Phase</option>
          <option value="solid">Solid</option>
        </select></div>
    {/if}
    {#if showRow("editor", "Cursor Style line block underline")}
      <div class="row"><div class="meta"><div class="label">Cursor Style</div><div class="desc">Shape of the text cursor in the editor.</div></div>
        <select class="select" bind:value={settings.cursorStyle}>
          <option value="line">Line</option>
          <option value="block">Block</option>
          <option value="underline">Underline</option>
        </select></div>
    {/if}

    {#if !filter.trim() && section === "languages"}<div class="group-title">Languages & Tools</div>{/if}
    {#if showRow("languages", "Default Formatter prettier rustfmt builtin")}
      <div class="row"><div class="meta"><div class="label">Default Formatter</div><div class="desc">Formatter used when no language-specific formatter is set.</div></div>
        <select class="select" bind:value={settings.defaultFormatter}>
          <option value="prettier">Prettier</option>
          <option value="rustfmt">rustfmt</option>
          <option value="builtin">Built-in</option>
        </select></div>
    {/if}
    {#if showRow("languages", "Default Linter eslint clippy builtin none")}
      <div class="row"><div class="meta"><div class="label">Default Linter</div><div class="desc">Linter used for diagnostics when no override is configured.</div></div>
        <select class="select" bind:value={settings.defaultLinter}>
          <option value="eslint">ESLint</option>
          <option value="clippy">Clippy</option>
          <option value="builtin">Built-in</option>
          <option value="none">None</option>
        </select></div>
    {/if}
    {#if showRow("languages", "TypeScript SDK Path tsserver node_modules")}
      <div class="row"><div class="meta"><div class="label">TypeScript SDK Path</div><div class="desc">Path to a custom TypeScript installation for language services.</div></div>
        <input class="text-input wide" type="text" placeholder="Use workspace version" bind:value={settings.typescriptSdkPath} aria-label="TypeScript SDK Path" /></div>
    {/if}
    {#if showRow("languages", "Rust Analyzer Path rust-analyzer binary executable")}
      <div class="row"><div class="meta"><div class="label">Rust Analyzer Path</div><div class="desc">Path to the rust-analyzer binary for Rust language support.</div></div>
        <input class="text-input wide" type="text" placeholder="Use PATH" bind:value={settings.rustAnalyzerPath} aria-label="Rust Analyzer Path" /></div>
    {/if}
    {#if showRow("languages", "ESLint Auto Fix On Save fix problems")}
      <div class="row"><div class="meta"><div class="label">ESLint Auto Fix On Save</div><div class="desc">Apply ESLint auto-fixes when saving supported files.</div></div>
        <button type="button" class="toggle" class:on={settings.eslintAutoFixOnSave} role="switch" aria-checked={settings.eslintAutoFixOnSave} aria-label="ESLint Auto Fix On Save" onclick={() => (settings.eslintAutoFixOnSave = !settings.eslintAutoFixOnSave)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("languages", "Format On Paste auto format clipboard")}
      <div class="row"><div class="meta"><div class="label">Format On Paste</div><div class="desc">Automatically format pasted content in the editor.</div></div>
        <button type="button" class="toggle" class:on={settings.formatOnPaste} role="switch" aria-checked={settings.formatOnPaste} aria-label="Format On Paste" onclick={() => (settings.formatOnPaste = !settings.formatOnPaste)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "search-files"}<div class="group-title">Search & Files</div>{/if}
    {#if showRow("search-files", "Search Exclude Patterns glob files folders skip")}
      <div class="row"><div class="meta"><div class="label">Search Exclude Patterns</div><div class="desc">Glob patterns for files and folders excluded from workspace search.</div></div>
        <input class="text-input wide" type="text" bind:value={settings.searchExcludePatterns} placeholder="**/node_modules/**" aria-label="Search Exclude Patterns" /></div>
    {/if}
    {#if showRow("search-files", "Files Exclude Patterns explorer hide sidebar")}
      <div class="row"><div class="meta"><div class="label">Files Exclude Patterns</div><div class="desc">Glob patterns for files hidden from the file explorer.</div></div>
        <input class="text-input wide" type="text" bind:value={settings.filesExcludePatterns} placeholder="**/.git, **/node_modules" aria-label="Files Exclude Patterns" /></div>
    {/if}
    {#if showRow("search-files", "Search Case Sensitive match uppercase lowercase")}
      <div class="row"><div class="meta"><div class="label">Search Case Sensitive</div><div class="desc">Match search queries with exact letter casing.</div></div>
        <button type="button" class="toggle" class:on={settings.searchCaseSensitive} role="switch" aria-checked={settings.searchCaseSensitive} aria-label="Search Case Sensitive" onclick={() => (settings.searchCaseSensitive = !settings.searchCaseSensitive)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("search-files", "Follow Symlinks symbolic links search traverse")}
      <div class="row"><div class="meta"><div class="label">Follow Symlinks</div><div class="desc">Traverse symbolic links when searching the workspace.</div></div>
        <button type="button" class="toggle" class:on={settings.searchFollowSymlinks} role="switch" aria-checked={settings.searchFollowSymlinks} aria-label="Follow Symlinks" onclick={() => (settings.searchFollowSymlinks = !settings.searchFollowSymlinks)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("search-files", "File Nesting explorer tree collapse related")}
      <div class="row"><div class="meta"><div class="label">File Nesting</div><div class="desc">Collapse related files under their parent in the explorer tree.</div></div>
        <button type="button" class="toggle" class:on={settings.fileNestingEnabled} role="switch" aria-checked={settings.fileNestingEnabled} aria-label="File Nesting" onclick={() => (settings.fileNestingEnabled = !settings.fileNestingEnabled)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("search-files", "Use Regular Expression regex search pattern")}
      <div class="row"><div class="meta"><div class="label">Use Regular Expression</div><div class="desc">Treat search queries as regular expressions by default.</div></div>
        <button type="button" class="toggle" class:on={settings.searchUseRegex} role="switch" aria-checked={settings.searchUseRegex} aria-label="Use Regular Expression" onclick={() => (settings.searchUseRegex = !settings.searchUseRegex)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("search-files", "Match Whole Word search boundary token")}
      <div class="row"><div class="meta"><div class="label">Match Whole Word</div><div class="desc">Only match complete words, not partial substrings.</div></div>
        <button type="button" class="toggle" class:on={settings.searchWholeWord} role="switch" aria-checked={settings.searchWholeWord} aria-label="Match Whole Word" onclick={() => (settings.searchWholeWord = !settings.searchWholeWord)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("search-files", "Include Ignored Files gitignore search hidden")}
      <div class="row"><div class="meta"><div class="label">Include Ignored Files</div><div class="desc">Include files matched by .gitignore in search results.</div></div>
        <button type="button" class="toggle" class:on={settings.searchIncludeIgnored} role="switch" aria-checked={settings.searchIncludeIgnored} aria-label="Include Ignored Files" onclick={() => (settings.searchIncludeIgnored = !settings.searchIncludeIgnored)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "windows-layout"}<div class="group-title">Windows & Layout</div>{/if}
    {#if showRow("windows-layout", "Restore Windows session layout reopen")}
      <div class="row"><div class="meta"><div class="label">Restore Windows</div><div class="desc">Reopen windows and their layout from the previous session.</div></div>
        <button type="button" class="toggle" class:on={settings.restoreWindows} role="switch" aria-checked={settings.restoreWindows} aria-label="Restore Windows" onclick={() => (settings.restoreWindows = !settings.restoreWindows)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("windows-layout", "Zen Mode distraction free minimal interface")}
      <div class="row"><div class="meta"><div class="label">Zen Mode</div><div class="desc">Hide sidebars and panels for a distraction-free editing layout.</div></div>
        <button type="button" class="toggle" class:on={settings.zenMode} role="switch" aria-checked={settings.zenMode} aria-label="Zen Mode" onclick={() => (settings.zenMode = !settings.zenMode)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("windows-layout", "Centered Layout editor column narrow focus")}
      <div class="row"><div class="meta"><div class="label">Centered Layout</div><div class="desc">Center the editor column with constrained width for focused reading.</div></div>
        <button type="button" class="toggle" class:on={settings.centeredLayout} role="switch" aria-checked={settings.centeredLayout} aria-label="Centered Layout" onclick={() => (settings.centeredLayout = !settings.centeredLayout)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("windows-layout", "Title Bar Style native custom hidden window chrome")}
      <div class="row"><div class="meta"><div class="label">Title Bar Style</div><div class="desc">How the window title bar and controls are rendered.</div></div>
        <select class="select" bind:value={settings.titleBarStyle}>
          {#each titleBarStyles as style (style.id)}<option value={style.id}>{style.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("windows-layout", "Open Folders In New Window workspace separate")}
      <div class="row"><div class="meta"><div class="label">Open Folders In New Window</div><div class="desc">Open each folder in a separate application window.</div></div>
        <button type="button" class="toggle" class:on={settings.openFoldersInNewWindow} role="switch" aria-checked={settings.openFoldersInNewWindow} aria-label="Open Folders In New Window" onclick={() => (settings.openFoldersInNewWindow = !settings.openFoldersInNewWindow)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("windows-layout", "Restore Fullscreen maximize window state")}
      <div class="row"><div class="meta"><div class="label">Restore Fullscreen</div><div class="desc">Restore fullscreen state when reopening the application.</div></div>
        <button type="button" class="toggle" class:on={settings.windowRestoreFullscreen} role="switch" aria-checked={settings.windowRestoreFullscreen} aria-label="Restore Fullscreen" onclick={() => (settings.windowRestoreFullscreen = !settings.windowRestoreFullscreen)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "panels"}<div class="group-title">Panels</div>{/if}
    {#if showRow("panels", "Panel Default Location bottom right left dock")}
      <div class="row"><div class="meta"><div class="label">Panel Default Location</div><div class="desc">Default dock position for terminal, output and debug panels.</div></div>
        <select class="select" bind:value={settings.panelDefaultLocation}>
          {#each panelLocations as loc (loc.id)}<option value={loc.id}>{loc.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("panels", "Panel Default Size height width pixels dock")}
      <div class="row"><div class="meta"><div class="label">Panel Default Size</div><div class="desc">Default panel size in pixels when first opened.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.panelDefaultSize = clamp(settings.panelDefaultSize - 20, 120, 600))}>-</button><span>{settings.panelDefaultSize}</span><button type="button" onclick={() => (settings.panelDefaultSize = clamp(settings.panelDefaultSize + 20, 120, 600))}>+</button></div></div>
    {/if}
    {#if showRow("panels", "Auto Hide Panels collapse inactive focus")}
      <div class="row"><div class="meta"><div class="label">Auto Hide Panels</div><div class="desc">Automatically collapse panels when the editor regains focus.</div></div>
        <button type="button" class="toggle" class:on={settings.autoHidePanels} role="switch" aria-checked={settings.autoHidePanels} aria-label="Auto Hide Panels" onclick={() => (settings.autoHidePanels = !settings.autoHidePanels)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("panels", "Sidebar Location left right explorer activity")}
      <div class="row"><div class="meta"><div class="label">Sidebar Location</div><div class="desc">Which side of the window the primary sidebar appears on.</div></div>
        <select class="select" bind:value={settings.sidebarLocation}>
          {#each sidebarLocations as loc (loc.id)}<option value={loc.id}>{loc.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("panels", "Maximize Panel On Open expand full height")}
      <div class="row"><div class="meta"><div class="label">Maximize Panel On Open</div><div class="desc">Expand a panel to maximum size when it is first opened.</div></div>
        <button type="button" class="toggle" class:on={settings.panelMaximizeOnOpen} role="switch" aria-checked={settings.panelMaximizeOnOpen} aria-label="Maximize Panel On Open" onclick={() => (settings.panelMaximizeOnOpen = !settings.panelMaximizeOnOpen)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("panels", "Secondary Sidebar Default visible hidden outline timeline")}
      <div class="row"><div class="meta"><div class="label">Secondary Sidebar Default</div><div class="desc">Whether the secondary sidebar is shown when a workspace opens.</div></div>
        <select class="select" bind:value={settings.secondarySidebarDefault}>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select></div>
    {/if}

    {#if !filter.trim() && section === "debugger"}<div class="group-title">Debugger</div>{/if}
    {#if showRow("debugger", "Debug Console Word Wrap output panel lines")}
      <div class="row"><div class="meta"><div class="label">Debug Console Word Wrap</div><div class="desc">Wrap long lines in the debug console output panel.</div></div>
        <button type="button" class="toggle" class:on={settings.debugConsoleWordWrap} role="switch" aria-checked={settings.debugConsoleWordWrap} aria-label="Debug Console Word Wrap" onclick={() => (settings.debugConsoleWordWrap = !settings.debugConsoleWordWrap)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("debugger", "Breakpoint Behavior always never exception pause")}
      <div class="row"><div class="meta"><div class="label">Breakpoint Behavior</div><div class="desc">When the debugger should pause on breakpoints.</div></div>
        <select class="select" bind:value={settings.breakpointBehavior}>
          {#each breakpointBehaviors as behavior (behavior.id)}<option value={behavior.id}>{behavior.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("debugger", "Step Into Filters skip libraries node_modules")}
      <div class="row"><div class="meta"><div class="label">Step Into Filters</div><div class="desc">Glob patterns for paths skipped when stepping into code.</div></div>
        <input class="text-input wide" type="text" bind:value={settings.stepIntoFilters} placeholder="**/node_modules/**" aria-label="Step Into Filters" /></div>
    {/if}
    {#if showRow("debugger", "Open Debug View On Break pause focus panel")}
      <div class="row"><div class="meta"><div class="label">Open Debug View On Break</div><div class="desc">Focus the debug panel when execution pauses at a breakpoint.</div></div>
        <button type="button" class="toggle" class:on={settings.debugOpenOnBreak} role="switch" aria-checked={settings.debugOpenOnBreak} aria-label="Open Debug View On Break" onclick={() => (settings.debugOpenOnBreak = !settings.debugOpenOnBreak)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("debugger", "Confirm On Debug Exit stop session warning")}
      <div class="row"><div class="meta"><div class="label">Confirm On Debug Exit</div><div class="desc">Ask for confirmation before stopping an active debug session.</div></div>
        <button type="button" class="toggle" class:on={settings.debugConfirmOnExit} role="switch" aria-checked={settings.debugConfirmOnExit} aria-label="Confirm On Debug Exit" onclick={() => (settings.debugConfirmOnExit = !settings.debugConfirmOnExit)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("debugger", "Inline Values variables hover debug gutter")}
      <div class="row"><div class="meta"><div class="label">Inline Values</div><div class="desc">Show variable values inline in the editor while debugging.</div></div>
        <button type="button" class="toggle" class:on={settings.debugInlineValues} role="switch" aria-checked={settings.debugInlineValues} aria-label="Inline Values" onclick={() => (settings.debugInlineValues = !settings.debugInlineValues)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "terminal"}<div class="group-title">Terminal</div>{/if}
    {#if showRow("terminal", "Shell Path executable bash powershell zsh")}
      <div class="row"><div class="meta"><div class="label">Shell Path</div><div class="desc">Path to the shell executable. Leave empty to use the system default.</div></div>
        <input class="text-input wide" type="text" bind:value={settings.terminalShellPath} placeholder="Auto-detect (e.g. {WINDOWS_POWERSHELL_PATH})" aria-label="Shell Path" /></div>
    {/if}
    {#if showRow("terminal", "Font Size terminal text pixels")}
      <div class="row"><div class="meta"><div class="label">Font Size</div><div class="desc">Font size for terminal text, in pixels.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.terminalFontSize = clamp(settings.terminalFontSize - 1, 8, 28))}>-</button><span>{settings.terminalFontSize}</span><button type="button" onclick={() => (settings.terminalFontSize = clamp(settings.terminalFontSize + 1, 8, 28))}>+</button></div></div>
    {/if}
    {#if showRow("terminal", "Scrollback buffer history lines limit")}
      <div class="row"><div class="meta"><div class="label">Scrollback</div><div class="desc">Number of lines kept in the terminal scrollback buffer.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.terminalScrollback = clamp(settings.terminalScrollback - 1000, 1000, 50000))}>-</button><span>{settings.terminalScrollback}</span><button type="button" onclick={() => (settings.terminalScrollback = clamp(settings.terminalScrollback + 1000, 1000, 50000))}>+</button></div></div>
    {/if}
    {#if showRow("terminal", "Copy On Select clipboard selection auto copy")}
      <div class="row"><div class="meta"><div class="label">Copy On Select</div><div class="desc">Automatically copy selected terminal text to the clipboard.</div></div>
        <button type="button" class="toggle" class:on={settings.terminalCopyOnSelect} role="switch" aria-checked={settings.terminalCopyOnSelect} aria-label="Copy On Select" onclick={() => (settings.terminalCopyOnSelect = !settings.terminalCopyOnSelect)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("terminal", "Cursor Style block underline line blink")}
      <div class="row"><div class="meta"><div class="label">Cursor Style</div><div class="desc">Shape of the terminal cursor.</div></div>
        <select class="select" bind:value={settings.terminalCursorStyle}>
          {#each terminalCursorStyles as style (style.id)}<option value={style.id}>{style.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("terminal", "GPU Acceleration rendering webgl canvas performance")}
      <div class="row"><div class="meta"><div class="label">GPU Acceleration</div><div class="desc">Use GPU-accelerated rendering for the integrated terminal.</div></div>
        <button type="button" class="toggle" class:on={settings.terminalGpuAcceleration} role="switch" aria-checked={settings.terminalGpuAcceleration} aria-label="GPU Acceleration" onclick={() => (settings.terminalGpuAcceleration = !settings.terminalGpuAcceleration)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("terminal", "Terminal Bell audible notification sound alert")}
      <div class="row"><div class="meta"><div class="label">Terminal Bell</div><div class="desc">Play a sound when the shell emits a bell character.</div></div>
        <button type="button" class="toggle" class:on={settings.terminalBell} role="switch" aria-checked={settings.terminalBell} aria-label="Terminal Bell" onclick={() => (settings.terminalBell = !settings.terminalBell)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("terminal", "Persist Session restore terminal tabs relaunch")}
      <div class="row"><div class="meta"><div class="label">Persist Session</div><div class="desc">Restore terminal tabs and their working directories on relaunch.</div></div>
        <button type="button" class="toggle" class:on={settings.terminalPersistSession} role="switch" aria-checked={settings.terminalPersistSession} aria-label="Persist Session" onclick={() => (settings.terminalPersistSession = !settings.terminalPersistSession)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "version-control"}<div class="group-title">Version Control</div>{/if}
    {#if showRow("version-control", "Git Enabled source control integration repository")}
      <div class="row"><div class="meta"><div class="label">Git Enabled</div><div class="desc">Enable Git source control integration in the workspace.</div></div>
        <button type="button" class="toggle" class:on={settings.gitEnabled} role="switch" aria-checked={settings.gitEnabled} aria-label="Git Enabled" onclick={() => (settings.gitEnabled = !settings.gitEnabled)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("version-control", "Auto Fetch remote changes background pull")}
      <div class="row"><div class="meta"><div class="label">Auto Fetch</div><div class="desc">Periodically fetch remote changes in the background.</div></div>
        <button type="button" class="toggle" class:on={settings.gitAutoFetch} role="switch" aria-checked={settings.gitAutoFetch} aria-label="Auto Fetch" onclick={() => (settings.gitAutoFetch = !settings.gitAutoFetch)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("version-control", "Diff Mode inline side by side compare changes")}
      <div class="row"><div class="meta"><div class="label">Diff Mode</div><div class="desc">How file diffs are displayed when comparing changes.</div></div>
        <select class="select" bind:value={settings.gitDiffMode}>
          {#each gitDiffModes as mode (mode.id)}<option value={mode.id}>{mode.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("version-control", "Git Blame author line annotations gutter")}
      <div class="row"><div class="meta"><div class="label">Git Blame</div><div class="desc">Show author and commit info inline in the editor gutter.</div></div>
        <button type="button" class="toggle" class:on={settings.gitBlame} role="switch" aria-checked={settings.gitBlame} aria-label="Git Blame" onclick={() => (settings.gitBlame = !settings.gitBlame)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("version-control", "Default Branch main master checkout new")}
      <div class="row"><div class="meta"><div class="label">Default Branch</div><div class="desc">Default branch name used when initializing or cloning repositories.</div></div>
        <input class="text-input" type="text" bind:value={settings.gitDefaultBranch} placeholder="main" aria-label="Default Branch" /></div>
    {/if}
    {#if showRow("version-control", "Sign Commits gpg signature verified")}
      <div class="row"><div class="meta"><div class="label">Sign Commits</div><div class="desc">Sign commits with your configured GPG key when available.</div></div>
        <button type="button" class="toggle" class:on={settings.gitSignCommits} role="switch" aria-checked={settings.gitSignCommits} aria-label="Sign Commits" onclick={() => (settings.gitSignCommits = !settings.gitSignCommits)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("version-control", "Pull Rebase merge strategy fast forward")}
      <div class="row"><div class="meta"><div class="label">Pull Rebase</div><div class="desc">Rebase local commits on top of remote changes when pulling.</div></div>
        <button type="button" class="toggle" class:on={settings.gitPullRebase} role="switch" aria-checked={settings.gitPullRebase} aria-label="Pull Rebase" onclick={() => (settings.gitPullRebase = !settings.gitPullRebase)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "collaboration"}<div class="group-title">Collaboration</div>{/if}
    {#if showRow("collaboration", "Live Share real-time session collaborate remote")}
      <div class="row"><div class="meta"><div class="label">Live Share</div><div class="desc">Allow others to join your workspace for real-time collaboration.</div></div>
        <button type="button" class="toggle" class:on={settings.liveShareEnabled} role="switch" aria-checked={settings.liveShareEnabled} aria-label="Live Share" onclick={() => (settings.liveShareEnabled = !settings.liveShareEnabled)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("collaboration", "Presence Indicators online status collaborators")}
      <div class="row"><div class="meta"><div class="label">Presence Indicators</div><div class="desc">Show when collaborators are online in the workspace.</div></div>
        <button type="button" class="toggle" class:on={settings.presenceIndicators} role="switch" aria-checked={settings.presenceIndicators} aria-label="Presence Indicators" onclick={() => (settings.presenceIndicators = !settings.presenceIndicators)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("collaboration", "Collaborator Cursors remote selection highlight")}
      <div class="row"><div class="meta"><div class="label">Collaborator Cursors</div><div class="desc">Display remote cursors and selections in shared editors.</div></div>
        <button type="button" class="toggle" class:on={settings.showCollaboratorCursors} role="switch" aria-checked={settings.showCollaboratorCursors} aria-label="Collaborator Cursors" onclick={() => (settings.showCollaboratorCursors = !settings.showCollaboratorCursors)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("collaboration", "Share On Open workspace session invite link")}
      <div class="row"><div class="meta"><div class="label">Share On Open</div><div class="desc">Prompt to start a live share session when opening a workspace.</div></div>
        <button type="button" class="toggle" class:on={settings.shareOnOpen} role="switch" aria-checked={settings.shareOnOpen} aria-label="Share On Open" onclick={() => (settings.shareOnOpen = !settings.shareOnOpen)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "ai"}<div class="group-title">AI</div>{/if}
    {#if showRow("ai", "Grok Model language model grok-build composer")}
      <div class="row"><div class="meta"><div class="label">Grok Model</div><div class="desc">Default Grok model used for chat, completions and agent tasks.</div></div>
        <select class="select" bind:value={settings.grokModel}>
          {#each grokModels as model (model.id)}<option value={model.id}>{model.label}</option>{/each}
        </select></div>
    {/if}
    {#if showRow("ai", "Context Window tokens conversation history limit")}
      <div class="row"><div class="meta"><div class="label">Context Window</div><div class="desc">Maximum tokens sent as context in AI requests.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.aiContextWindow = clamp(settings.aiContextWindow - 8000, 32000, 200000))}>-</button><span>{settings.aiContextWindow}</span><button type="button" onclick={() => (settings.aiContextWindow = clamp(settings.aiContextWindow + 8000, 32000, 200000))}>+</button></div></div>
    {/if}
    {#if showRow("ai", "Inline Suggestions ghost text autocomplete completion")}
      <div class="row"><div class="meta"><div class="label">Inline Suggestions</div><div class="desc">Show AI-powered ghost text completions while you type.</div></div>
        <button type="button" class="toggle" class:on={settings.aiInlineSuggestions} role="switch" aria-checked={settings.aiInlineSuggestions} aria-label="Inline Suggestions" onclick={() => (settings.aiInlineSuggestions = !settings.aiInlineSuggestions)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("ai", "Agent Mode Default autonomous tools tasks")}
      <div class="row"><div class="meta"><div class="label">Agent Mode Default</div><div class="desc">Open the AI panel in agent mode instead of chat by default.</div></div>
        <button type="button" class="toggle" class:on={settings.aiAgentModeDefault} role="switch" aria-checked={settings.aiAgentModeDefault} aria-label="Agent Mode Default" onclick={() => (settings.aiAgentModeDefault = !settings.aiAgentModeDefault)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("ai", "Temperature creativity randomness sampling")}
      <div class="row"><div class="meta"><div class="label">Temperature</div><div class="desc">Controls randomness in AI responses. Lower values are more focused.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.aiTemperature = stepFloat(settings.aiTemperature, -0.1, 0, 1))}>-</button><span>{settings.aiTemperature.toFixed(1)}</span><button type="button" onclick={() => (settings.aiTemperature = stepFloat(settings.aiTemperature, 0.1, 0, 1))}>+</button></div></div>
    {/if}
    {#if showRow("ai", "Max Tokens response length output limit")}
      <div class="row"><div class="meta"><div class="label">Max Tokens</div><div class="desc">Maximum tokens the model may generate in a single response.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.aiMaxTokens = clamp(settings.aiMaxTokens - 512, 512, 16384))}>-</button><span>{settings.aiMaxTokens}</span><button type="button" onclick={() => (settings.aiMaxTokens = clamp(settings.aiMaxTokens + 512, 512, 16384))}>+</button></div></div>
    {/if}
    {#if showRow("ai", "Include Open Files context editor tabs workspace")}
      <div class="row"><div class="meta"><div class="label">Include Open Files</div><div class="desc">Attach content from open editor tabs to AI context automatically.</div></div>
        <button type="button" class="toggle" class:on={settings.aiIncludeOpenFiles} role="switch" aria-checked={settings.aiIncludeOpenFiles} aria-label="Include Open Files" onclick={() => (settings.aiIncludeOpenFiles = !settings.aiIncludeOpenFiles)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("ai", "Auto Context relevant files project indexing")}
      <div class="row"><div class="meta"><div class="label">Auto Context</div><div class="desc">Automatically include relevant project files in AI requests.</div></div>
        <button type="button" class="toggle" class:on={settings.aiAutoContext} role="switch" aria-checked={settings.aiAutoContext} aria-label="Auto Context" onclick={() => (settings.aiAutoContext = !settings.aiAutoContext)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "network"}<div class="group-title">Network</div>{/if}
    {#if showRow("network", "Proxy URL http https socks gateway")}
      <div class="row"><div class="meta"><div class="label">Proxy URL</div><div class="desc">HTTP or SOCKS proxy URL for outbound network requests.</div></div>
        <input class="text-input" type="text" bind:value={settings.proxyUrl} placeholder="http://proxy:8080" aria-label="Proxy URL" /></div>
    {/if}
    {#if showRow("network", "Offline Mode disable network requests local")}
      <div class="row"><div class="meta"><div class="label">Offline Mode</div><div class="desc">Disable all outbound network requests and work locally only.</div></div>
        <button type="button" class="toggle" class:on={settings.offlineMode} role="switch" aria-checked={settings.offlineMode} aria-label="Offline Mode" onclick={() => (settings.offlineMode = !settings.offlineMode)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("network", "Request Timeout seconds network wait limit")}
      <div class="row"><div class="meta"><div class="label">Request Timeout</div><div class="desc">Seconds to wait before a network request is aborted.</div></div>
        <div class="stepper"><button type="button" onclick={() => (settings.requestTimeout = clamp(settings.requestTimeout - 5, 5, 120))}>-</button><span>{settings.requestTimeout}s</span><button type="button" onclick={() => (settings.requestTimeout = clamp(settings.requestTimeout + 5, 5, 120))}>+</button></div></div>
    {/if}
    {#if showRow("network", "Use System Proxy environment variables OS settings")}
      <div class="row"><div class="meta"><div class="label">Use System Proxy</div><div class="desc">Use the operating system proxy settings when no custom URL is set.</div></div>
        <button type="button" class="toggle" class:on={settings.useSystemProxy} role="switch" aria-checked={settings.useSystemProxy} aria-label="Use System Proxy" onclick={() => (settings.useSystemProxy = !settings.useSystemProxy)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("network", "TLS Verify certificate ssl security https")}
      <div class="row"><div class="meta"><div class="label">TLS Verify</div><div class="desc">Verify TLS certificates for HTTPS connections.</div></div>
        <button type="button" class="toggle" class:on={settings.tlsVerify} role="switch" aria-checked={settings.tlsVerify} aria-label="TLS Verify" onclick={() => (settings.tlsVerify = !settings.tlsVerify)}><span class="knob"></span></button></div>
    {/if}

    {#if !filter.trim() && section === "developer"}<div class="group-title">Developer</div>{/if}
    {#if showRow("developer", "DevTools web inspector debug console")}
      <div class="row"><div class="meta"><div class="label">DevTools</div><div class="desc">Enable the embedded web inspector for debugging the UI.</div></div>
        <button type="button" class="toggle" class:on={settings.devTools} role="switch" aria-checked={settings.devTools} aria-label="DevTools" onclick={() => (settings.devTools = !settings.devTools)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("developer", "Verbose Logging debug trace diagnostic output")}
      <div class="row"><div class="meta"><div class="label">Verbose Logging</div><div class="desc">Write detailed diagnostic logs to the developer console.</div></div>
        <button type="button" class="toggle" class:on={settings.verboseLogging} role="switch" aria-checked={settings.verboseLogging} aria-label="Verbose Logging" onclick={() => (settings.verboseLogging = !settings.verboseLogging)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("developer", "Experimental Features preview unstable beta")}
      <div class="row"><div class="meta"><div class="label">Experimental Features</div><div class="desc">Enable in-development features that may be unstable.</div></div>
        <button type="button" class="toggle" class:on={settings.experimentalFeatures} role="switch" aria-checked={settings.experimentalFeatures} aria-label="Experimental Features" onclick={() => (settings.experimentalFeatures = !settings.experimentalFeatures)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("developer", "Reload On Save hot reload refresh changes")}
      <div class="row"><div class="meta"><div class="label">Reload On Save</div><div class="desc">Reload the application window when source files are saved.</div></div>
        <button type="button" class="toggle" class:on={settings.reloadOnSave} role="switch" aria-checked={settings.reloadOnSave} aria-label="Reload On Save" onclick={() => (settings.reloadOnSave = !settings.reloadOnSave)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("developer", "Rust Logs backend tauri native stderr")}
      <div class="row"><div class="meta"><div class="label">Rust Logs</div><div class="desc">Forward Rust backend log output to the developer console.</div></div>
        <button type="button" class="toggle" class:on={settings.showRustLogs} role="switch" aria-checked={settings.showRustLogs} aria-label="Rust Logs" onclick={() => (settings.showRustLogs = !settings.showRustLogs)}><span class="knob"></span></button></div>
    {/if}
    {#if showRow("developer", "Source Maps stack traces debug mapping")}
      <div class="row"><div class="meta"><div class="label">Source Maps</div><div class="desc">Use source maps to map minified stack traces to original files.</div></div>
        <button type="button" class="toggle" class:on={settings.enableSourceMaps} role="switch" aria-checked={settings.enableSourceMaps} aria-label="Source Maps" onclick={() => (settings.enableSourceMaps = !settings.enableSourceMaps)}><span class="knob"></span></button></div>
    {/if}
    </div>
    </div>
  </div>
</div>

<style>
  .settings-view {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .settings-nav {
    width: 220px;
    flex-shrink: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 8px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }

  .nav-box { padding: 0 4px 10px; }
  .nav-input {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 10px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text);
    background: var(--hover);
    border: 1px solid var(--border);
    border-radius: 7px;
    outline: none;
  }
  .nav-input:focus { border-color: var(--accent); }

  .nav-item {
    text-align: left;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-mute);
    background: none;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .nav-item:hover { background: var(--hover); color: var(--text-dim); }
  .nav-item.active { background: var(--hover); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }

  .settings-main {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .settings-header {
    flex-shrink: 0;
    padding: 22px 34px 0;
    max-width: 960px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .settings-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .settings-inner {
    max-width: 960px;
    width: 100%;
    margin: 0 auto;
    padding: 18px 34px 32px;
    box-sizing: border-box;
  }

  .settings-tabs { display: flex; gap: 18px; margin-bottom: 18px; }
  .st-tab { font-size: 13px; color: var(--text-mute); padding-bottom: 4px; }
  .st-tab.active { color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }

  .settings-title { margin: 0; font-size: 20px; font-weight: 500; color: var(--text); }
  .settings-note { margin: 4px 0 18px; font-size: 12px; color: var(--text-mute); }

  .group-title {
    margin: 22px 0 4px;
    font-family: 'Cascadia Code', monospace;
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--text-mute);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
    min-width: 0;
  }
  .row.col { align-items: flex-start; flex-wrap: wrap; }
  .meta { flex: 1; min-width: 0; }
  .label { font-size: 13px; font-weight: 400; color: var(--text); }
  .desc { margin-top: 3px; font-size: 12px; color: var(--text-mute); }

  .toggle {
    flex-shrink: 0;
    width: 38px;
    height: 22px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--hover);
    cursor: pointer;
    position: relative;
    transition: background 0.15s, border-color 0.15s;
  }
  .toggle.on { background: var(--accent); border-color: var(--accent); }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--panel-solid);
    transition: transform 0.16s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .toggle.on .knob { transform: translateX(16px); }

  .select {
    flex-shrink: 0;
    padding: 5px 8px;
    font-size: 12px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-dim);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    cursor: pointer;
    outline: none;
  }
  .select:focus { border-color: var(--accent); }

  .text-input {
    flex-shrink: 0;
    width: 200px;
    box-sizing: border-box;
    padding: 6px 10px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text);
    background: var(--panel-solid);
    border: 1px solid var(--border);
    border-radius: 7px;
    outline: none;
  }
  .text-input:focus { border-color: var(--accent); }
  .text-input::placeholder { color: var(--text-mute); }
  .text-input.wide { width: min(280px, 100%); }

  .stepper {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .stepper button {
    width: 22px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-mute);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .stepper button:hover { background: var(--hover); color: var(--text); border-color: var(--text-mute); }
  .stepper span { min-width: 30px; text-align: center; font-size: 12px; font-weight: 400; color: var(--text-dim); }

  .theme-grid { display: grid; grid-template-columns: repeat(2, 132px); gap: 10px; flex-shrink: 0; }
  .theme-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s;
  }
  .theme-card:hover { border-color: var(--text-mute); background: var(--hover); }
  .theme-card.active { border-color: var(--accent); background: var(--accent-soft); }
  .theme-prev {
    position: relative;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .tp-bar { position: absolute; top: 0; left: 0; right: 0; height: 9px; opacity: 0.85; }
  .tp-dot { position: absolute; bottom: 8px; left: 8px; width: 14px; height: 14px; border-radius: 50%; opacity: 0.9; }
  .theme-name { font-size: 12px; color: var(--text-dim); text-align: center; }
  .theme-card.active .theme-name { color: var(--text); }
</style>
