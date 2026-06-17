<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import { onDestroy, onMount, tick } from "svelte";
  import { fade, slide } from "svelte/transition";
  import { getCurrentWebview } from "@tauri-apps/api/webview";
  import {
    fileMeta,
    languageOf,
    isTextFile,
    buildThemeStyle,
    loadSettings,
    type SearchMatch,
  } from "$lib/editor-utils";
  import {
    applyDeveloperRuntime,
    applySavePipeline,
    breakpointBehaviorLabel,
    buildAiStatusChips,
    buildDebugConsoleClasses,
    buildEditorClasses,
    buildEditorStatusInfo,
    buildEditorStyleVars,
    computeSearch,
    buildExtraThemeVars,
    buildGrokLaunchCommand,
    buildOutputPanelLines,
    buildStatusChips,
    buildIdeLayoutClassesWithSecondary,
    applyRestoredTerminalSettings,
    buildTerminalSessionSlice,
    createChordState,
    extractOutlineSymbols,
    getSearchOptionFlags,
    initialSecondarySidebarOpen,
    panelInlineStyle,
    panelResizeCursor,
    parseSessionPayload,
    resolveRestoredTerminalOpen,
    resolveSavedTerminalOpen,
    shouldPersistSessionSnapshot,
    shouldAutoHideTerminal,
    shouldBlockNetworkRequests,
    shouldExpandSymlinkDirectory,
    shouldReloadAfterSave,
    formatContent,
    handleAutoClose,
    insertTabAtSelection,
    isSearchExcluded,
    lintContent,
    lintWorkspaceTabs,
    type WorkspaceLintIssue,
    matchKeybinding,
    mergeMultiCursorAnchor,
    multiCursorModifierActive,
    panelMaximizedHeight,
    vimCursorDown,
    vimCursorLeft,
    vimCursorRight,
    vimCursorUp,
    resetChord,
    resolveChordSecondKey,
    shouldAutoShareOnOpen,
    shouldPauseOnBreakpoint,
    shouldShowBreadcrumbs,
    shouldShowCollaboratorCursors,
    shouldShowGitPanel,
    shouldShowPresenceIndicators,
    shouldRestoreSession,
    shouldStepInto,
    startChord,
    stickyScrollHeaders,
    syncAiContext,
    syncRuntimeFlags,
    type ChordState,
    type SearchOptionFlags,
  } from "$lib/settings-runtime";
  import Settings from "$lib/Settings.svelte";
  import Onboarding from "$lib/Onboarding.svelte";
  import LaunchSplash from "$lib/LaunchSplash.svelte";
  import {
    shouldRequireOnboarding,
    markLegacyOnboardingComplete,
  } from "$lib/onboarding-storage";
  import { setTelemetryEnabled } from "$lib/telemetry-client";
  import {
    prepareWizardWindow,
    transitionToWorkspace,
    restoreFullscreenIfRequested,
    delay,
  } from "$lib/window-lifecycle";
  import {
    createLayoutConstraintState,
    reconcileLayout,
    scheduleLayoutReconcile,
  } from "$lib/layout/layout-store.svelte";
  import { clampPanelSize, panelWorkspaceSpan } from "$lib/layout/solver";
  import SearchPanel from "$lib/SearchPanel.svelte";
  import SourceControl from "$lib/SourceControl.svelte";
  import Terminal from "$lib/Terminal.svelte";
  import ParallelAgents from "$lib/ParallelAgents.svelte";
  import AgentActivityFeed from "$lib/AgentActivityFeed.svelte";
  import WindowChrome from "$lib/WindowChrome.svelte";
  import { bindViewportSync } from "$lib/viewport-sync";
  import FolderTrustDialog from "$lib/FolderTrustDialog.svelte";
  import ExplorerPanel from "$lib/explorer/ExplorerPanel.svelte";
  import QuickOpen from "$lib/explorer/QuickOpen.svelte";
  import {
    mountWorkspace,
    unmountWorkspace,
    refreshExplorerIndex,
    refreshGitStatus,
    invalidateChildren,
    getSearchableExplorerNodes,
    getGitStatusMap,
    workspaceExcludePatterns,
    setSelectedFolderPath,
  } from "$lib/explorer/explorer-store.svelte";
  import { gitStatusForPath } from "$lib/explorer/agent-overlay";
  import { normalizePathKey } from "$lib/explorer/path-utils";
  import type { ExplorerTreeNode } from "$lib/workspace/types";
  import {
    isFolderTrusted,
    shouldPromptFolderTrust,
    trustFolder,
    type FolderTrustChoice,
  } from "$lib/folder-trust";
  import { attachParser, detachParser, startActivitySession } from "$lib/agent-activity/activity-bridge";
  import { getActiveActivitySession, isSessionLive } from "$lib/agent-activity/activity-store";
  import { type MissionGoal, type ParallelAgent } from "$lib/agent-grid";
  import {
    GROK_CLI_INSTALL_UNIX,
    GROK_CLI_INSTALL_WINDOWS,
    isGrokCliAvailable,
  } from "$lib/grok-cli";

  type EditorTab = { path: string; name: string; content: string; savedContent: string };

  const slideX = { axis: "x" as const, duration: 200 };
  const slideY = { duration: 200 };
  const fadeFast = { duration: 120 };

  const initialSettings = markLegacyOnboardingComplete(loadSettings());
  const needsOnboarding = shouldRequireOnboarding(initialSettings);
  let settings = $state(initialSettings);
  let appPhase = $state<"launch" | "onboarding" | "workspace">("launch");
  let workspaceVisible = $state(false);

  $effect(() => {
    if (!settings.onboardingCompleted && appPhase !== "workspace") return;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("Grokden.settings", JSON.stringify(settings));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  });

  let folderPath = $state<string | null>(null);
  let selectedFolderPath = $state<string | null>(null);
  let folderRestricted = $state(false);
  let folderTrustPendingPath = $state<string | null>(null);
  let folderTrustParent = $state(false);
  let tabs = $state<EditorTab[]>([]);
  let quickOpenVisible = $state(false);
  let activeTabPath = $state<string | null>(null);
  let saveError = $state("");

  let activePanel = $state<"explorer" | "search" | "scm">("explorer");
  let userSidebarOpen = $state(true);
  let userSecondaryOpen = $state(initialSecondarySidebarOpen(settings));
  let userTerminalOpen = $state(settings.showTerminalOnStart);
  let sidebarCollapsed = $state(false);
  let terminalOpen = $state(settings.showTerminalOnStart);
  let secondarySidebarOpen = $state(initialSecondarySidebarOpen(settings));
  let view = $state<"editor" | "settings" | "agents">("editor");
  let parallelAgents = $state<ParallelAgent[]>([]);
  let missionGoals = $state<MissionGoal[]>([]);
  let agentSwarmOpen = $state(false);
  let settingsOpen = $state(false);
  let searchQuery = $state("");
  let cursorLine = $state(1);
  let cursorCol = $state(1);
  let grokLaunching = $state(false);
  let grokCliAvailable = $state<boolean | null>(null);
  let grokCliChecking = $state(false);
  let grokInjectToken = $state(0);
  let grokActivityDetach: (() => void) | null = null;
  let mainTerminalId = $state<number | null>(null);
  let secondaryPanelTab = $state<"outline" | "activity">("outline");
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let sessionPersistTimer: ReturnType<typeof setTimeout> | undefined;
  let gitFetchTimer: ReturnType<typeof setInterval> | undefined;
  let aiContextTimer: ReturnType<typeof setTimeout> | undefined;
  let sidebarBeforeZen: boolean | null = null;
  let terminalHeight = $state(settings.panelDefaultSize);
  let sessionKey = "Grokden.session";
  let sessionHydrated = $state(false);
  let bottomPanelTab = $state<"terminal" | "output" | "problems" | "debug">("terminal");
  let debugSessionActive = $state(false);
  let debugPaused = $state(false);
  let gitLastFetch = $state<Date | null>(null);
  let shareStatus = $state<string | null>(null);
  const chordState: ChordState = createChordState();
  let extraCursors = $state<number[]>([]);
  let multiCursorAnchor: number | null = null;
  let vimSubMode = $state<"NORMAL" | "INSERT">("NORMAL");
  let formatNotice = $state("");
  let settingsNotice = $state("");
  let editorTextarea: HTMLTextAreaElement | undefined = $state();
  let editorScrollEl = $state<HTMLDivElement | undefined>();
  let workspaceBodyEl = $state<HTMLDivElement | undefined>();
  let workspaceBodyHeight = $state(720);
  let workspaceBodyWidth = $state(1280);
  let layoutConstraint = createLayoutConstraintState();
  let layoutStyle = $state("");
  let resolvedPanelSize = $state(settings.panelDefaultSize);
  let showTerminalOnStartPrev = settings.showTerminalOnStart;

  const mockCollaborators = [
    { name: "Alex", color: "#7c6cf0", line: 3, col: 12 },
    { name: "Sam", color: "#6fcf97", line: 8, col: 4 },
  ];

  // Only apply maximize/default height when the terminal opens — not on close,
  // so slide/layout transitions and user-resized heights are preserved.
  $effect(() => {
    settings.panelDefaultLocation;
    if (!userTerminalOpen) return;
    if (settings.panelMaximizeOnOpen) {
      terminalHeight = clampTerminalSize(panelMaximizedHeight(settings));
    }
  });

  $effect(() => {
    const el = workspaceBodyEl;
    if (!el) return;
    measureWorkspaceBody();
    const ro = new ResizeObserver(() => {
      measureWorkspaceBody();
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  $effect(() => {
    settings.panelDefaultLocation;
    settings.uiDensity;
    settings.zenMode;
    userSidebarOpen;
    userSecondaryOpen;
    userTerminalOpen;
    terminalHeight;
    workspaceBodyWidth;
    workspaceBodyHeight;
    scheduleLayoutReconcile(runLayoutReconcile);
  });

  $effect(() => {
    syncRuntimeFlags(settings);
    applyDeveloperRuntime(settings, () => {
      const webview = getCurrentWebview() as ReturnType<typeof getCurrentWebview> & {
        openDevTools?: () => Promise<void>;
      };
      return webview.openDevTools?.() ?? Promise.resolve();
    });
  });

  $effect(() => {
    const aiOn = settings.aiIncludeOpenFiles || settings.aiAutoContext;
    if (!aiOn) {
      if (aiContextTimer) {
        clearTimeout(aiContextTimer);
        aiContextTimer = undefined;
      }
      syncAiContext(settings, tabs, activeTabPath);
      return;
    }
    if (aiContextTimer) clearTimeout(aiContextTimer);
    aiContextTimer = setTimeout(() => {
      syncAiContext(settings, tabs, activeTabPath);
      aiContextTimer = undefined;
    }, 400);
    return () => {
      if (aiContextTimer) clearTimeout(aiContextTimer);
    };
  });

  $effect(() => {
    void setTelemetryEnabled(settings.telemetryEnabled);
  });

  $effect(() => {
    if (settings.showTerminalOnStart !== showTerminalOnStartPrev) {
      userTerminalOpen = settings.showTerminalOnStart;
      showTerminalOnStartPrev = settings.showTerminalOnStart;
      scheduleLayoutReconcile(runLayoutReconcile);
    }
  });

  $effect(() => {
    if (!settings.gitEnabled && activePanel === "scm") {
      activePanel = "explorer";
    }
  });

  $effect(() => {
    clearInterval(gitFetchTimer);
    if (settings.gitEnabled && settings.gitAutoFetch && !shouldBlockNetworkRequests(settings)) {
      gitLastFetch = new Date();
      gitFetchTimer = setInterval(() => {
        gitLastFetch = new Date();
      }, 60_000);
    } else {
      gitLastFetch = null;
    }
    return () => clearInterval(gitFetchTimer);
  });

  $effect(() => {
    if (!shouldAutoShareOnOpen(settings) || !folderPath) return;
    shareStatus = `Sharing ${folderName || folderPath}…`;
    const timer = setTimeout(() => {
      shareStatus = "Live Share session active";
    }, 1200);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (!settings.liveShareEnabled) {
      shareStatus = null;
    }
  });

  $effect(() => {
    if (settings.zenMode) {
      if (sidebarBeforeZen === null) sidebarBeforeZen = userSidebarOpen;
      userSidebarOpen = false;
    } else if (sidebarBeforeZen !== null) {
      userSidebarOpen = sidebarBeforeZen;
      sidebarBeforeZen = null;
    }
    scheduleLayoutReconcile(runLayoutReconcile);
  });

  $effect(() => {
    if (!settings.vimMode) {
      vimSubMode = "INSERT";
    } else {
      vimSubMode = "NORMAL";
    }
  });

  $effect(() => {
    if (typeof localStorage === "undefined") return;
    const terminal = buildTerminalSessionSlice(settings, folderRestricted ? false : terminalOpen, folderPath);
    const payload = {
      folderPath,
      tabs: tabs.map((t) => ({
        path: t.path,
        name: t.name,
        savedContent: t.savedContent,
        ...(t.content !== t.savedContent ? { content: t.content } : {}),
      })),
      activeTabPath,
      terminalOpen: folderRestricted ? false : terminalOpen,
      terminal,
      secondarySidebarOpen,
      sidebarCollapsed,
      activePanel,
    };
    if (!shouldPersistSessionSnapshot(settings, sessionHydrated, payload)) return;
    clearTimeout(sessionPersistTimer);
    sessionPersistTimer = setTimeout(() => {
      try {
        localStorage.setItem(sessionKey, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(sessionPersistTimer);
  });

  function hidePanelsOnEditorFocus() {
    if (shouldAutoHideTerminal(settings) && userTerminalOpen) {
      blurActiveTerminal();
      setUserTerminalOpen(false);
    }
  }

  function measureWorkspaceBody() {
    if (!workspaceBodyEl) return;
    workspaceBodyHeight = workspaceBodyEl.clientHeight;
    workspaceBodyWidth = workspaceBodyEl.clientWidth;
    scheduleLayoutReconcile(runLayoutReconcile);
  }

  function clampTerminalSize(size: number): number {
    const span = panelWorkspaceSpan(
      settings.panelDefaultLocation,
      workspaceBodyWidth,
      workspaceBodyHeight,
    );
    const reserved =
      settings.panelDefaultLocation !== "bottom"
        ? (userSidebarOpen && !settings.zenMode ? 280 : 0) +
          (userSecondaryOpen && !settings.zenMode ? 240 : 0)
        : 0;
    return clampPanelSize(size, span, { reservedAlongAxis: reserved });
  }

  function runLayoutReconcile() {
    const railReserve = settings.zenMode ? 0 : settings.uiDensity === "compact" ? 42 : 40;
    const chromeReserve = settings.uiDensity === "compact" ? 84 : settings.uiDensity === "spacious" ? 108 : 92;
    const result = reconcileLayout({
      settings,
      measure: {
        workspaceWidth: workspaceBodyWidth,
        workspaceHeight: workspaceBodyHeight,
        outerWidth: workspaceBodyWidth + railReserve,
        outerHeight: workspaceBodyHeight + chromeReserve,
      },
      sidebarCollapsed: !userSidebarOpen,
      secondarySidebarOpen: userSecondaryOpen,
      terminalOpen: userTerminalOpen,
      terminalHeight,
      constraint: layoutConstraint,
    });
    layoutConstraint = result.constraint;
    layoutStyle = result.layoutStyle;
    resolvedPanelSize = result.panelSize;
    sidebarCollapsed = result.sidebarCollapsed;
    secondarySidebarOpen = result.secondarySidebarOpen;
    terminalOpen = result.terminalOpen;
    if (result.panelSize > 0 && result.terminalHeight !== terminalHeight) {
      terminalHeight = result.terminalHeight;
    }
  }

  function setUserSidebarOpen(open: boolean) {
    userSidebarOpen = open;
    layoutConstraint = {
      ...layoutConstraint,
      collapsedByConstraint: { ...layoutConstraint.collapsedByConstraint, sidebar: false },
    };
    runLayoutReconcile();
  }

  function setUserSecondaryOpen(open: boolean) {
    userSecondaryOpen = open;
    layoutConstraint = {
      ...layoutConstraint,
      collapsedByConstraint: { ...layoutConstraint.collapsedByConstraint, secondary: false },
    };
    runLayoutReconcile();
  }

  function setUserTerminalOpen(open: boolean) {
    userTerminalOpen = open;
    layoutConstraint = {
      ...layoutConstraint,
      collapsedByConstraint: { ...layoutConstraint.collapsedByConstraint, panel: false },
    };
    runLayoutReconcile();
  }

  function startTerminalResize(event: MouseEvent) {
    event.preventDefault();
    measureWorkspaceBody();
    const sidePanel = settings.panelDefaultLocation !== "bottom";
    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = resolvedPanelSize;

    const onMove = (ev: MouseEvent) => {
      const delta = sidePanel ? ev.clientX - startX : startY - ev.clientY;
      const signedDelta = settings.panelDefaultLocation === "left" ? -delta : delta;
      terminalHeight = clampTerminalSize(startSize + signedDelta);
    };

    const onUp = () => {
      settings.panelDefaultSize = terminalHeight;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  let activeTab = $derived(tabs.find((tab) => tab.path === activeTabPath) ?? null);

  let editorLines = $derived(
    activeTab
      ? activeTab.content.split("\n").map((content, index) => ({ num: index + 1, content }))
      : [],
  );

  let folderName = $derived(
    folderPath ? folderPath.split(/[/\\]+/).filter(Boolean).pop() ?? folderPath : "",
  );

  let dirtyCount = $derived(tabs.filter((tab) => isDirty(tab)).length);
  let changes = $derived(
    tabs
      .filter((tab) => isDirty(tab))
      .map((tab) => ({
        name: tab.name,
        path: tab.path,
        status: gitStatusForPath(getGitStatusMap(), tab.path) ?? "M",
      })),
  );
  let filteredNodes = $derived(
    getSearchableExplorerNodes().filter((n) => !isSearchExcluded(n.path, settings)),
  );
  let searchResults = $derived(computeSearch(searchQuery, tabs, filteredNodes, settings));
  let searchOptions = $derived(getSearchOptionFlags(settings));
  let outlineSymbols = $derived(
    activeTab ? extractOutlineSymbols(activeTab.content) : [],
  );
  let rootStyle = $derived(`${buildThemeStyle(settings)};${buildExtraThemeVars(settings)}`);
  let layoutClasses = $derived(buildIdeLayoutClassesWithSecondary(settings, secondarySidebarOpen));
  let effectiveTerminalHeight = $derived(
    terminalOpen ? (resolvedPanelSize > 0 ? resolvedPanelSize : clampTerminalSize(terminalHeight)) : 0,
  );
  let panelStyle = $derived(panelInlineStyle(settings, effectiveTerminalHeight));
  let terminalDockedBottom = $derived(
    terminalOpen && settings.panelDefaultLocation === "bottom",
  );
  let terminalDockedSide = $derived(
    terminalOpen && settings.panelDefaultLocation !== "bottom",
  );
  let editorClasses = $derived(buildEditorClasses(settings));
  let editorStyleVars = $derived(buildEditorStyleVars(settings));
  let editorTextHeight = $derived(
    Math.max(editorLines.length, 1) * settings.lineHeight + 24,
  );
  let stickyHeaders = $derived(
    activeTab && settings.stickyScroll
      ? stickyScrollHeaders(activeTab.content, cursorLine)
      : [],
  );
  let workspaceLintIssues = $derived(lintWorkspaceTabs(tabs, settings));
  let activeTabLintCount = $derived(
    activeTab ? lintContent(activeTab.content, activeTab.name, settings).length : 0,
  );
  let editorStatus = $derived(
    buildEditorStatusInfo(
      settings,
      activeTab?.name ?? null,
      activeTabLintCount,
      extraCursors.length,
      settings.vimMode ? vimSubMode : null,
    ),
  );
  let breadcrumbs = $derived(
    activeTab && shouldShowBreadcrumbs(settings)
      ? activeTab.path.split(/[/\\]+/).filter(Boolean)
      : [],
  );
  let scopedStatusChips = $derived(buildStatusChips(settings));
  let debugConsoleClasses = $derived(buildDebugConsoleClasses(settings));
  let showPresence = $derived(shouldShowPresenceIndicators(settings));
  let showCollabCursors = $derived(shouldShowCollaboratorCursors(settings));
  let debugInlineHint = $derived(
    debugSessionActive && debugPaused && settings.debugInlineValues && activeTab
      ? `content.length = ${activeTab.content.length}, lines = ${editorLines.length}`
      : null,
  );
  let grokInjectCommand = $derived(buildGrokLaunchCommand(settings));
  let aiStatusChips = $derived(buildAiStatusChips(settings));
  let outputPanelLines = $derived(buildOutputPanelLines(settings));

  function getParentPath(filePath: string): string {
    const normalized = filePath.replace(/[/\\]+$/, "");
    const index = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
    if (index <= 0) return normalized;
    return normalized.slice(0, index);
  }

  function getTargetFolderPath(): string | null {
    return selectedFolderPath ?? folderPath;
  }

  function validateName(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return "Name cannot be empty";
    if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
      return "Name cannot contain .., /, or \\";
    }
    return null;
  }

  function isDirty(tab: EditorTab): boolean {
    return tab.content !== tab.savedContent;
  }

  function syncCursor(event: Event) {
    const el = event.currentTarget as HTMLTextAreaElement;
    const upto = el.value.slice(0, el.selectionStart);
    const lines = upto.split("\n");
    cursorLine = lines.length;
    cursorCol = lines[lines.length - 1].length + 1;
  }

  function scheduleAutoSave() {
    if (!settings.autoSave) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      void saveAll();
    }, 800);
  }

  function findTabByPath(path: string) {
    const key = normalizePathKey(path);
    return tabs.find((tab) => normalizePathKey(tab.path) === key) ?? null;
  }

  function updateTabContent(value: string) {
    if (folderRestricted || !activeTabPath) return;
    tabs = tabs.map((tab) => (tab.path === activeTabPath ? { ...tab, content: value } : tab));
    saveError = "";
    scheduleAutoSave();
  }

  async function saveTab(tab: { path: string; name?: string }) {
    if (folderRestricted) {
      restrictedFeatureNotice("Saving files");
      return;
    }
    const target = tabs.find((t) => t.path === tab.path);
    if (!target || !isDirty(target)) return;
    const pipeline = applySavePipeline(target.content, target.name, settings);
    if (pipeline.changed) {
      tabs = tabs.map((t) =>
        t.path === target.path ? { ...t, content: pipeline.content } : t,
      );
      formatNotice = `Formatted (${pipeline.label})`;
      setTimeout(() => {
        if (formatNotice === `Formatted (${pipeline.label})`) formatNotice = "";
      }, 2500);
    }
    const toSave = pipeline.content;
    const snapshotBeforeSave = target.content;
    try {
      await invoke("save_file", { filePath: target.path, content: toSave });
      tabs = tabs.map((t) => {
        if (t.path !== target.path) return t;
        const content = t.content === snapshotBeforeSave ? toSave : t.content;
        return { ...t, content, savedContent: toSave };
      });
      saveError = "";
      void refreshGitStatus();
      if (shouldReloadAfterSave(settings)) {
        location.reload();
      }
    } catch (error) {
      saveError = String(error);
      console.error("Failed to save file:", error);
    }
  }

  async function saveActiveTab() {
    if (activeTab) await saveTab(activeTab);
  }

  async function saveAll() {
    for (const tab of tabs) {
      if (isDirty(tab)) await saveTab(tab);
    }
  }

  function revertTab(path: string) {
    tabs = tabs.map((tab) => (tab.path === path ? { ...tab, content: tab.savedContent } : tab));
  }

  function revertAll() {
    tabs = tabs.map((tab) => ({ ...tab, content: tab.savedContent }));
  }

  /** Pick the next main view after closing a settings or swarm panel tab. */
  function resolveViewAfterPanelClose(closed: "agents" | "settings"): "editor" | "settings" | "agents" {
    if (closed === "agents" && settingsOpen) return "settings";
    if (closed === "settings" && agentSwarmOpen) return "agents";
    return "editor";
  }

  function openSettings() {
    settingsOpen = true;
    view = "settings";
  }

  function closeSettings(event?: MouseEvent) {
    event?.stopPropagation();
    settingsOpen = false;
    if (view === "settings") view = resolveViewAfterPanelClose("settings");
  }

  function jumpToLine(line: number, col = 1) {
    cursorLine = line;
    cursorCol = col;
    queueMicrotask(() => {
      const el = editorTextarea;
      if (!el) return;
      const lines = el.value.split("\n");
      let pos = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      pos += Math.max(0, col - 1);
      el.focus();
      el.setSelectionRange(pos, pos);
      syncCursor({ currentTarget: el } as unknown as Event);
      scrollEditorToLine(line);
    });
  }

  function jumpToMatch(match: SearchMatch) {
    activeTabPath = match.path;
    view = "editor";
    jumpToLine(match.line, 1);
  }

  function toggleSearchOption(key: keyof SearchOptionFlags) {
    switch (key) {
      case "caseSensitive":
        settings.searchCaseSensitive = !settings.searchCaseSensitive;
        break;
      case "useRegex":
        settings.searchUseRegex = !settings.searchUseRegex;
        break;
      case "wholeWord":
        settings.searchWholeWord = !settings.searchWholeWord;
        break;
      case "includeIgnored":
        settings.searchIncludeIgnored = !settings.searchIncludeIgnored;
        break;
      case "followSymlinks":
        settings.searchFollowSymlinks = !settings.searchFollowSymlinks;
        break;
    }
  }

  function isTerminalHostInteractive(host: HTMLElement): boolean {
    let node: HTMLElement | null = host;
    while (node) {
      if (
        node.classList.contains("terminal-pane-hidden") ||
        node.classList.contains("terminal-pane-display-hidden") ||
        node.classList.contains("panel-hidden")
      ) {
        return false;
      }
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      node = node.parentElement;
    }
    return true;
  }

  function blurActiveTerminal() {
    const active = document.activeElement as HTMLElement | null;
    active?.closest(".xterm")?.querySelector("textarea")?.blur();
  }

  function isTerminalFocused(target: HTMLElement | null): boolean {
    const host = target?.closest("[data-terminal-root]") as HTMLElement | null;
    if (!host || !isTerminalHostInteractive(host)) return false;
    if (view === "agents" && host.closest("footer.terminal")) return false;
    return true;
  }

  function shouldIgnoreGlobalShortcut(target: HTMLElement | null): boolean {
    if (!target) return false;
    if (target.classList.contains("code-textarea")) return false;
    if (quickOpenVisible) return true;
    if (settingsOpen && target.closest(".settings-view")) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!workspaceVisible || appPhase !== "workspace") return;
    const mod = event.ctrlKey || event.metaKey;
    const target = event.target as HTMLElement | null;
    const inEditor = target?.classList?.contains("code-textarea") ?? false;
    if (isTerminalFocused(target)) return;
    if (shouldIgnoreGlobalShortcut(target)) return;

    if (settings.enableChordKeybindings && mod && event.key.toLowerCase() === "k" && !event.shiftKey) {
      event.preventDefault();
      startChord(chordState, settings.chordTimeout, () => undefined);
      return;
    }

    if (chordState.pending && settings.enableChordKeybindings) {
      if (event.key === "Escape") {
        resetChord(chordState);
        event.preventDefault();
        return;
      }
      event.preventDefault();
      const action = resolveChordSecondKey(event.key);
      resetChord(chordState);
      if (action === "saveAll") void saveAll();
      else if (action === "openSettings") openSettings();
      else if (action === "toggleZen") settings.zenMode = !settings.zenMode;
      return;
    }

    if (matchKeybinding(event, "save", settings)) {
      event.preventDefault();
      void saveActiveTab();
      return;
    }
    if (matchKeybinding(event, "saveAll", settings)) {
      event.preventDefault();
      void saveAll();
      return;
    }
    if (matchKeybinding(event, "toggleSidebar", settings) && !settings.zenMode) {
      event.preventDefault();
      setUserSidebarOpen(!userSidebarOpen);
      return;
    }
    if (matchKeybinding(event, "toggleTerminal", settings)) {
      event.preventDefault();
      toggleTerminalPanel();
      return;
    }
    if (matchKeybinding(event, "openSettings", settings)) {
      event.preventDefault();
      openSettings();
      return;
    }
    if (matchKeybinding(event, "toggleZen", settings)) {
      event.preventDefault();
      settings.zenMode = !settings.zenMode;
      return;
    }
    if (matchKeybinding(event, "quickOpen", settings)) {
      event.preventDefault();
      quickOpenVisible = !quickOpenVisible;
      return;
    }
    if (matchKeybinding(event, "commandPalette", settings)) {
      event.preventDefault();
      openSettings();
      return;
    }
    if (matchKeybinding(event, "closeTab", settings)) {
      event.preventDefault();
      if (view === "settings" && settingsOpen) {
        closeSettings();
      } else if (view === "agents" && agentSwarmOpen) {
        closeAgentSwarm();
      } else if (activeTabPath) {
        closeTab(activeTabPath, event as unknown as MouseEvent);
      }
      return;
    }

    if (settings.vimMode && inEditor && vimSubMode === "NORMAL" && !mod) {
      const el = editorTextarea;
      if (!el) return;
      event.preventDefault();
      const pos = el.selectionStart;
      const val = el.value;
      if (event.key === "i") {
        vimSubMode = "INSERT";
        return;
      }
      const move =
        event.key === "h"
          ? vimCursorLeft(pos)
          : event.key === "l"
            ? vimCursorRight(val, pos)
            : event.key === "j"
              ? vimCursorDown(val, pos)
              : event.key === "k"
                ? vimCursorUp(val, pos)
                : null;
      if (move !== null) {
        el.setSelectionRange(move, move);
        syncCursor({ currentTarget: el } as unknown as Event);
      }
      return;
    }

    if (settings.vimMode && event.key === "Escape") {
      if (inEditor) {
        vimSubMode = "NORMAL";
        event.preventDefault();
      } else {
        settings.zenMode = false;
      }
    }
  }

  function handleEditorKeydown(event: KeyboardEvent) {
    if (folderRestricted) return;
    const el = event.currentTarget as HTMLTextAreaElement;
    editorTextarea = el;

    if (settings.vimMode && vimSubMode === "NORMAL") {
      event.preventDefault();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const { value, start, end } = insertTabAtSelection(
        el.value,
        el.selectionStart,
        el.selectionEnd,
        settings,
      );
      updateTabContent(value);
      queueMicrotask(() => el.setSelectionRange(start, end));
      return;
    }

    if (settings.autoClosingBrackets && event.key.length === 1) {
      const result = handleAutoClose(
        el.value,
        el.selectionStart,
        event.key,
        settings.autoClosingBrackets,
      );
      if (result) {
        event.preventDefault();
        updateTabContent(result.value);
        queueMicrotask(() => el.setSelectionRange(result.cursor, result.cursor));
      }
    }
  }

  function handleEditorMouseDown(event: MouseEvent) {
    const el = event.currentTarget as HTMLTextAreaElement;
    editorTextarea = el;
    if (multiCursorModifierActive(event, settings.multiCursorModifier)) {
      multiCursorAnchor = el.selectionStart;
    } else {
      multiCursorAnchor = null;
    }
  }

  function handleEditorClick(event: MouseEvent) {
    const el = event.currentTarget as HTMLTextAreaElement;
    editorTextarea = el;
    syncCursor(event);
    if (multiCursorModifierActive(event, settings.multiCursorModifier)) {
      extraCursors = mergeMultiCursorAnchor(extraCursors, multiCursorAnchor, el.selectionStart);
      multiCursorAnchor = null;
    } else {
      extraCursors = [];
      multiCursorAnchor = null;
    }
  }

  function handleEditorPaste(event: ClipboardEvent) {
    if (folderRestricted) {
      event.preventDefault();
      return;
    }
    if (!settings.formatOnPaste || !activeTab) return;
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text") ?? "";
    const el = event.currentTarget as HTMLTextAreaElement;
    const before = el.value.slice(0, el.selectionStart);
    const after = el.value.slice(el.selectionEnd);
    const merged = before + pasted + after;
    const fmt = formatContent(merged, activeTab.name, settings);
    updateTabContent(fmt.content);
    if (fmt.changed) {
      formatNotice = `Pasted & formatted (${fmt.label})`;
      setTimeout(() => {
        if (formatNotice.startsWith("Pasted")) formatNotice = "";
      }, 2500);
    }
    queueMicrotask(() => {
      const cursor = before.length + (fmt.content.length - before.length - after.length);
      el.setSelectionRange(cursor, cursor);
    });
  }

  function scrollEditorToLine(line: number) {
    const viewport = editorScrollEl;
    if (!viewport) return;
    const lineHeight = settings.lineHeight;
    const padTop = 12 + (settings.stickyScroll ? 28 : 0);
    const lineTop = padTop + (line - 1) * lineHeight;
    viewport.scrollTop = Math.max(0, lineTop - viewport.clientHeight / 3);
  }

  function selectBottomPanelTab(tab: "terminal" | "output" | "problems" | "debug") {
    if (tab !== "terminal") blurActiveTerminal();
    bottomPanelTab = tab;
    setUserTerminalOpen(true);
  }

  async function refreshGrokCliStatus() {
    grokCliChecking = true;
    try {
      grokCliAvailable = await isGrokCliAvailable();
      if (settings.verboseLogging) {
        console.info(`[Grokden] Grok CLI on PATH: ${grokCliAvailable ? "yes" : "no"}`);
      }
    } finally {
      grokCliChecking = false;
    }
  }

  function restrictedFeatureNotice(feature: string) {
    settingsNotice = `Restricted mode: ${feature} is disabled until you trust this folder.`;
    setTimeout(() => {
      if (settingsNotice.startsWith("Restricted mode:")) settingsNotice = "";
    }, 5000);
  }

  function enableTrustedFolderFeatures() {
    folderRestricted = false;
  }

  function confirmClearUnsavedTabs(): boolean {
    if (dirtyCount === 0) return true;
    const label = dirtyCount === 1 ? "1 unsaved tab" : `${dirtyCount} unsaved tabs`;
    return window.confirm(`Open a new folder? ${label} will be closed without saving.`);
  }

  async function applyFolderWorkspace(path: string, choice: FolderTrustChoice) {
    if (!confirmClearUnsavedTabs()) return;
    folderRestricted = choice === "restricted";
    folderPath = path;
    await mountWorkspace(path, workspaceExcludePatterns(settings));
    selectedFolderPath = path;
    tabs = [];
    activeTabPath = null;
    if (folderRestricted) {
      setUserTerminalOpen(false);
      if (view === "agents") closeAgentSwarm();
    }
  }

  function beginFolderTrustPrompt(path: string) {
    folderTrustPendingPath = path;
    folderTrustParent = false;
  }

  async function resolveFolderOpen(path: string) {
    if (shouldPromptFolderTrust(path)) {
      beginFolderTrustPrompt(path);
      return;
    }
    enableTrustedFolderFeatures();
    try {
      await applyFolderWorkspace(path, "trusted");
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  }

  async function handleFolderTrustChoice(choice: FolderTrustChoice) {
    const path = folderTrustPendingPath;
    if (!path) return;
    folderTrustPendingPath = null;
    if (choice === "trusted") {
      trustFolder(path, { trustParent: folderTrustParent });
      enableTrustedFolderFeatures();
    }
    try {
      await applyFolderWorkspace(path, choice);
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  }

  function trustCurrentFolder() {
    if (!folderPath) return;
    trustFolder(folderPath);
    enableTrustedFolderFeatures();
    settingsNotice = "Folder trusted — terminals and agents are now enabled.";
    setTimeout(() => {
      if (settingsNotice.startsWith("Folder trusted")) settingsNotice = "";
    }, 4000);
  }

  function toggleTerminalPanel() {
    if (folderRestricted && !userTerminalOpen) {
      restrictedFeatureNotice("Terminal");
      return;
    }
    const opening = !userTerminalOpen;
    setUserTerminalOpen(!userTerminalOpen);
    if (opening) selectBottomPanelTab("terminal");
  }

  function launchGrokCli() {
    if (folderRestricted) {
      restrictedFeatureNotice("Grok CLI");
      return;
    }
    if (grokLaunching) return;
    if (grokCliAvailable !== true) {
      if (grokCliAvailable === false) {
        settingsNotice = "Install Grok CLI first — see the welcome screen or README for install commands.";
        setTimeout(() => {
          if (settingsNotice.startsWith("Install Grok CLI first")) settingsNotice = "";
        }, 6000);
        selectBottomPanelTab("terminal");
      }
      return;
    }
    grokLaunching = true;
    setUserTerminalOpen(true);
    setUserSecondaryOpen(true);
    secondaryPanelTab = "activity";
    grokActivityDetach?.();
    if (mainTerminalId != null) detachParser(mainTerminalId);
    const sessionId = startActivitySession("Grok CLI");
    if (mainTerminalId != null) {
      grokActivityDetach = attachParser(sessionId, mainTerminalId);
      grokActivityPendingSessionId = null;
    } else {
      grokActivityPendingSessionId = sessionId;
    }
    selectBottomPanelTab("terminal");
    grokInjectToken += 1;
    setTimeout(() => (grokLaunching = false), 600);
  }

  let grokActivityPendingSessionId = $state<string | null>(null);

  function handleMainTerminalSpawned(terminalId: number) {
    mainTerminalId = terminalId;
    if (!grokActivityPendingSessionId) return;
    grokActivityDetach = attachParser(grokActivityPendingSessionId, terminalId);
    grokActivityPendingSessionId = null;
  }

  const activeAgentSession = $derived(getActiveActivitySession());

  function openAgentSwarm() {
    if (folderRestricted) {
      restrictedFeatureNotice("Parallel Agent Swarm");
      return;
    }
    agentSwarmOpen = true;
    view = "agents";
    blurActiveTerminal();
    setUserSidebarOpen(false);
    setUserSecondaryOpen(true);
    secondaryPanelTab = "activity";
  }

  function closeAgentSwarm() {
    agentSwarmOpen = false;
    if (view === "agents") view = resolveViewAfterPanelClose("agents");
  }

  function startDebugSession() {
    debugSessionActive = true;
    debugPaused = false;
    selectBottomPanelTab("debug");
  }

  function stopDebugSession() {
    if (debugSessionActive && settings.debugConfirmOnExit) {
      if (!window.confirm("Stop the active debug session?")) return;
    }
    debugSessionActive = false;
    debugPaused = false;
  }

  function simulateBreakpoint(onException = false) {
    if (!shouldPauseOnBreakpoint(settings, onException)) return;
    if (!debugSessionActive) startDebugSession();
    debugPaused = true;
    if (settings.debugOpenOnBreak) {
      selectBottomPanelTab("debug");
    }
  }

  function simulateStepInto() {
    if (!debugSessionActive || !activeTab) return;
    const allowed = shouldStepInto(activeTab.path, settings);
    if (!allowed) {
      window.alert(`Step into skipped — path matches filter: ${activeTab.path}`);
      return;
    }
    debugPaused = true;
  }

  function jumpToLintIssue(issue: WorkspaceLintIssue) {
    activeTabPath = issue.path;
    view = "editor";
    jumpToLine(issue.line, 1);
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (settings.confirmBeforeQuit && dirtyCount > 0) {
      event.preventDefault();
    }
  }

  async function restoreSession() {
    if (!shouldRestoreSession(settings)) return;
    try {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) return;
      const saved = parseSessionPayload(raw);
      if (!saved) return;
      if (saved.folderPath) {
        const previousFolderPath = folderPath;
        const previousSelectedFolderPath = selectedFolderPath;
        const previousFolderRestricted = folderRestricted;
        try {
          folderRestricted = !isFolderTrusted(saved.folderPath);
          folderPath = saved.folderPath;
          await mountWorkspace(saved.folderPath, workspaceExcludePatterns(settings));
          selectedFolderPath = saved.folderPath;
          if (folderRestricted) userTerminalOpen = false;
        } catch (mountError) {
          folderPath = previousFolderPath;
          selectedFolderPath = previousSelectedFolderPath;
          folderRestricted = previousFolderRestricted;
          throw mountError;
        }
      }
      if (saved.tabs?.length) {
        const restored: EditorTab[] = [];
        for (const t of saved.tabs) {
          const rawTab = t as { content?: unknown };
          const buffer = typeof rawTab.content === "string" ? rawTab.content : null;
          try {
            const disk = await invoke<string>("read_file", { filePath: t.path });
            const content = buffer ?? disk;
            restored.push({ path: t.path, name: t.name, content, savedContent: disk });
          } catch {
            const fallback = buffer ?? t.savedContent ?? "";
            restored.push({ path: t.path, name: t.name, content: fallback, savedContent: t.savedContent ?? fallback });
          }
        }
        tabs = restored;
        const candidate = saved.activeTabPath ?? restored[0]?.path ?? null;
        activeTabPath =
          candidate && restored.some((tab) => tab.path === candidate)
            ? candidate
            : restored[0]?.path ?? null;
      }
      userTerminalOpen = folderRestricted
        ? false
        : resolveRestoredTerminalOpen(settings, resolveSavedTerminalOpen(saved));
      settings = applyRestoredTerminalSettings(settings, saved);
      if (saved.secondarySidebarOpen !== undefined) {
        userSecondaryOpen = saved.secondarySidebarOpen;
      } else {
        userSecondaryOpen = initialSecondarySidebarOpen(settings);
      }
      if (saved.sidebarCollapsed !== undefined) userSidebarOpen = !saved.sidebarCollapsed;
      if (saved.activePanel) activePanel = saved.activePanel;
    } catch (error) {
      console.error("Failed to restore session:", error);
    }
  }

  async function enterWorkspace() {
    await refreshGrokCliStatus();
    await restoreSession();
    await transitionToWorkspace();
    await restoreFullscreenIfRequested(settings.windowRestoreFullscreen);
    await delay(80);
    workspaceVisible = true;
    appPhase = "workspace";
    sessionHydrated = true;
    await tick();
    measureWorkspaceBody();
    runLayoutReconcile();
  }

  function handleOnboardingComplete(updated: typeof settings) {
    settings = updated;
    void enterWorkspace();
    void setTelemetryEnabled(updated.telemetryEnabled);
  }

  let unbindViewportSync: (() => void) | undefined;

  onMount(() => {
    void bindViewportSync(() => {
      measureWorkspaceBody();
      runLayoutReconcile();
    }).then((unbind) => {
      unbindViewportSync = unbind;
    });
    if (settings.startupBehavior === "empty" || settings.startupBehavior === "welcome") {
      tabs = [];
      activeTabPath = null;
      folderPath = null;
      void unmountWorkspace();
      view = "editor";
      if (settings.startupBehavior === "welcome" && settings.verboseLogging) {
        console.info("[Grokden] Startup behavior: welcome screen");
      }
    }
    if (settings.windowRestoreFullscreen && settings.verboseLogging) {
      console.info("[Grokden] windowRestoreFullscreen enabled — fullscreen restore on next launch");
    }
    void (async () => {
      await setTelemetryEnabled(settings.telemetryEnabled);
      if (needsOnboarding) {
        await prepareWizardWindow();
        await delay(900);
        appPhase = "onboarding";
      } else {
        await delay(500);
        await enterWorkspace();
      }
    })();
  });

  onDestroy(() => {
    unbindViewportSync?.();
    clearTimeout(autoSaveTimer);
    clearTimeout(sessionPersistTimer);
    if (gitFetchTimer) clearInterval(gitFetchTimer);
    grokActivityDetach?.();
  });

  async function openFolder() {
    try {
      const defaultPath = settings.defaultOpenFolder.trim() || undefined;
      const selected = await open({ directory: true, multiple: false, defaultPath });
      if (!selected || typeof selected !== "string") return;
      if (settings.openFoldersInNewWindow) {
        settingsNotice = "New window mode: would open in a separate window (using current window)";
        if (settings.verboseLogging) {
          console.info("[Grokden] openFoldersInNewWindow — fallback to current window:", selected);
        }
        setTimeout(() => {
          if (settingsNotice.startsWith("New window mode")) settingsNotice = "";
        }, 4500);
      }
      await resolveFolderOpen(selected);
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  }

  async function refreshExplorer() {
    if (!folderPath) return;
    try {
      await refreshExplorerIndex(workspaceExcludePatterns(settings));
    } catch (error) {
      const message = String(error);
      console.error("Failed to refresh explorer:", error);
      window.alert(message);
    }
  }

  async function createNewFile() {
    if (folderRestricted) {
      restrictedFeatureNotice("Creating files");
      return;
    }
    const parentPath = getTargetFolderPath();
    if (!parentPath) return;
    const input = window.prompt("New file name:");
    if (input === null) return;
    const validationError = validateName(input);
    if (validationError) {
      window.alert(validationError);
      return;
    }
    const name = input.trim();
    try {
      const filePath = await invoke<string>("create_file", { parentPath, name });
      await invalidateChildren(parentPath);
      await refreshExplorerIndex(workspaceExcludePatterns(settings));
      await openFile({ name, path: filePath });
    } catch (error) {
      const message = String(error);
      console.error("Failed to create file:", error);
      window.alert(message);
    }
  }

  async function createNewFolder() {
    if (folderRestricted) {
      restrictedFeatureNotice("Creating folders");
      return;
    }
    const parentPath = getTargetFolderPath();
    if (!parentPath) return;
    const input = window.prompt("New folder name:");
    if (input === null) return;
    const validationError = validateName(input);
    if (validationError) {
      window.alert(validationError);
      return;
    }
    const name = input.trim();
    try {
      const folderPathCreated = await invoke<string>("create_folder", { parentPath, name });
      await invalidateChildren(parentPath);
      await refreshExplorerIndex(workspaceExcludePatterns(settings));
      selectedFolderPath = folderPathCreated;
    } catch (error) {
      const message = String(error);
      console.error("Failed to create folder:", error);
      window.alert(message);
    }
  }

  async function openFile(entry: { name: string; path: string } | ExplorerTreeNode) {
    if (!isTextFile(entry.name)) return;
    selectedFolderPath = getParentPath(entry.path);
    view = "editor";
    const existing = findTabByPath(entry.path);
    if (existing) {
      activeTabPath = existing.path;
      return;
    }
    try {
      const content = await invoke<string>("read_file", { filePath: entry.path });
      tabs = [...tabs, { path: entry.path, name: entry.name, content, savedContent: content }];
      activeTabPath = entry.path;
      saveError = "";
      cursorLine = 1;
      cursorCol = 1;
    } catch (error) {
      console.error("Failed to read file:", error);
    }
  }

  function selectTab(path: string) {
    activeTabPath = path;
    view = "editor";
    cursorLine = 1;
    cursorCol = 1;
    queueMicrotask(() => {
      const el = editorTextarea;
      if (!el) return;
      el.setSelectionRange(0, 0);
      syncCursor({ currentTarget: el } as unknown as Event);
    });
  }

  function closeTab(path: string, event: MouseEvent) {
    event.stopPropagation();
    const tab = tabs.find((t) => t.path === path);
    if (tab && isDirty(tab) && settings.confirmClose) {
      if (!window.confirm(`Discard unsaved changes to ${tab.name}?`)) return;
    }
    const index = tabs.findIndex((t) => t.path === path);
    if (index === -1) return;
    clearTimeout(autoSaveTimer);
    tabs = [...tabs.slice(0, index), ...tabs.slice(index + 1)];
    const remaining = tabs;
    if (activeTabPath === path) {
      activeTabPath = remaining.length === 0 ? null : remaining[Math.min(index, remaining.length - 1)].path;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={handleBeforeUnload} />

{#key appPhase}
  {#if appPhase === "launch"}
    <div class="phase-shell" in:fade={{ duration: 200 }} out:fade={{ duration: 220 }}>
      <WindowChrome locked />
      <LaunchSplash />
    </div>
  {:else if appPhase === "onboarding"}
    <div class="phase-shell" in:fade={{ duration: 280 }} out:fade={{ duration: 220 }}>
      <WindowChrome locked />
      <Onboarding {settings} oncomplete={handleOnboardingComplete} />
    </div>
  {/if}
{/key}
{#if workspaceVisible}
<div
  class="ide{layoutClasses.ide} workspace-enter"
  style="{rootStyle};{layoutStyle}"
  data-ui-lang={settings.uiLanguage}
  data-theme={settings.theme}
>
  <WindowChrome />
  <header class="topbar" data-tauri-drag-region>
    <div class="topbar-left" data-tauri-drag-region>
      <img class="logo-img" src="/favicon.png" alt="" width="22" height="22" />
      <span class="app-name">Grokden</span>
      <span class="version-pill">v0.1.5</span>
    </div>

    <div class="command-hint" data-tauri-drag-region>
      <span class="command-text">{folderName || "No folder open"}</span>
      {#if grokCliAvailable === false}
        <span class="command-badge grok-cli-missing" transition:fade title="Grok CLI was not found on PATH">
          Grok CLI not found
        </span>
      {/if}
      {#if settingsNotice}
        <span class="command-badge settings-notice" transition:fade>{settingsNotice}</span>
      {/if}
      {#if dirtyCount > 0}
        <span class="command-badge" transition:fade>{dirtyCount} unsaved</span>
      {/if}
      {#if shareStatus}
        <span class="command-badge share-badge" transition:fade>{shareStatus}</span>
      {/if}
      {#if showPresence}
        <span class="presence-strip" aria-label="Collaborators online">
          {#each mockCollaborators as collab (collab.name)}
            <span class="presence-dot" style="background: {collab.color}" title="{collab.name} is online"></span>
          {/each}
        </span>
      {/if}
    </div>

    <div class="topbar-actions">
      <button type="button" class="save-btn" onclick={saveActiveTab} disabled={!activeTab || !isDirty(activeTab)} title="Save (Ctrl+S)">Save</button>
    </div>
  </header>

  <div class="workspace{layoutClasses.workspace}">
    <nav class="activity-rail" aria-label="Activity bar" class:zen-hidden={settings.zenMode}>
      <button type="button" class="rail-btn" class:active={activePanel === "explorer" && !sidebarCollapsed} aria-label="Explorer" onclick={() => { if (activePanel === "explorer" && !sidebarCollapsed) { setUserSidebarOpen(false); } else { activePanel = "explorer"; setUserSidebarOpen(true); } }}>
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h6l1.5 1.5v7.5H2.5V2.5z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M8.5 2.5V4h3" fill="none" stroke="currentColor" stroke-width="1.25"/></svg>
        <span class="rail-hint">Explorer</span>
      </button>
      <button type="button" class="rail-btn" class:active={activePanel === "search" && !sidebarCollapsed} aria-label="Search" onclick={() => { activePanel = "search"; setUserSidebarOpen(true); }}>
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M10 10l3 3" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>
        <span class="rail-hint">Search</span>
      </button>
      <button type="button" class="rail-btn" class:active={activePanel === "scm" && !sidebarCollapsed} aria-label="Source Control" disabled={!shouldShowGitPanel(settings)} onclick={() => { if (!shouldShowGitPanel(settings)) return; activePanel = "scm"; setUserSidebarOpen(true); }}>
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="4" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="11" cy="7" r="1.5" fill="currentColor"/><path d="M5 5.5v5M5 7.5h4a1.5 1.5 0 0 0 0-3" fill="none" stroke="currentColor" stroke-width="1.25"/></svg>
        {#if dirtyCount > 0}<span class="rail-badge">{dirtyCount}</span>{/if}
        <span class="rail-hint">Source Control</span>
      </button>
      <span class="rail-spacer"></span>
      <button type="button" class="rail-btn" class:active={agentSwarmOpen} aria-label="Parallel Agents" onclick={openAgentSwarm}>
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="9" y="2" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="2" y="9" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="9" y="9" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>
        <span class="rail-hint">Agent Swarm</span>
      </button>
      <button type="button" class="rail-btn" class:active={userTerminalOpen} aria-label="Terminal" onclick={toggleTerminalPanel}>
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M4.5 8l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="rail-hint">Terminal</span>
      </button>
      <button
        type="button"
        class="rail-btn"
        class:active={secondarySidebarOpen}
        aria-label="Agent activity"
        onclick={() => {
          if (secondarySidebarOpen && secondaryPanelTab === "activity") {
            setUserSecondaryOpen(false);
          } else {
            setUserSecondaryOpen(true);
            secondaryPanelTab = "activity";
          }
        }}
      >
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M3 8h7M3 11.5h10" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><circle cx="12.5" cy="8" r="1.5" fill="currentColor"/></svg>
        {#if activeAgentSession && isSessionLive(activeAgentSession)}
          <span class="rail-live" aria-hidden="true"></span>
        {/if}
        <span class="rail-hint">Activity</span>
      </button>
      <button type="button" class="rail-btn" class:active={settingsOpen} aria-label="Settings" onclick={openSettings}>
        <svg class="rail-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2M4.1 4.1l1.4 1.4M10.5 10.5l1.4 1.4M4.1 11.9l1.4-1.4M10.5 5.5l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>
        <span class="rail-hint">Settings</span>
      </button>
    </nav>

    <div
      class="workspace-body{layoutClasses.workspaceBody}"
      class:terminal-docked-bottom={terminalDockedBottom}
      class:terminal-docked-side={terminalDockedSide}
      bind:this={workspaceBodyEl}
    >
    <div class="workspace-panels{layoutClasses.workspacePanels}">
    {#if !sidebarCollapsed && !settings.zenMode}
      <aside class="sidebar" transition:slide={settings.enableAnimations ? slideX : { duration: 0 }}>
        {#if activePanel !== "explorer"}
          <div class="sidebar-header">
            <span>{activePanel === "search" ? "Search" : "Source Control"}</span>
          </div>
        {/if}

        {#if activePanel === "explorer"}
          <ExplorerPanel
            {settings}
            {folderPath}
            {folderRestricted}
            {selectedFolderPath}
            {activeTabPath}
            {view}
            onOpenFolder={openFolder}
            onOpenFile={openFile}
            onNewFile={createNewFile}
            onNewFolder={createNewFolder}
            onRefresh={refreshExplorer}
            onSelectFolder={(path) => {
              selectedFolderPath = path;
              setSelectedFolderPath(path);
            }}
          />
        {:else if activePanel === "search"}
          <SearchPanel {searchOptions} query={searchQuery} results={searchResults} onInput={(value) => (searchQuery = value)} onOpen={(hit) => openFile(hit)} onJump={(match) => jumpToMatch(match)} onToggleOption={toggleSearchOption} />
        {:else if shouldShowGitPanel(settings)}
          <SourceControl
            {changes}
            gitDiffMode={settings.gitDiffMode}
            gitBlame={settings.gitBlame}
            gitAutoFetch={settings.gitAutoFetch}
            gitDefaultBranch={settings.gitDefaultBranch}
            gitSignCommits={settings.gitSignCommits}
            gitPullRebase={settings.gitPullRebase}
            {gitLastFetch}
            onOpen={(c) => { activeTabPath = c.path; view = "editor"; }}
            onSave={(c) => saveTab(c)}
            onRevert={(c) => revertTab(c.path)}
            onSaveAll={saveAll}
            onRevertAll={revertAll}
          />
        {:else}
          <div class="panel-empty-git">Git is disabled in Settings → Version Control.</div>
        {/if}
      </aside>
    {/if}

    <main class="editor-area">
      <div class="tab-bar dark-scrollbar">
        {#if agentSwarmOpen}
          <button type="button" class="tab" class:active={view === "agents"} onclick={() => (view = "agents")}>
            <span class="tab-badge swarm-badge">SW</span>
            <span class="tab-name">Agent Swarm</span>
            <span class="tab-close" role="button" tabindex="0" aria-label="Close Agent Swarm" onclick={(e) => { e.stopPropagation(); closeAgentSwarm(); }} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeAgentSwarm(); } }}></span>
          </button>
        {/if}
        {#if settingsOpen}
          <button type="button" class="tab" class:active={view === "settings"} onclick={() => (view = "settings")}>
            <span class="tab-badge settings-badge">SET</span>
            <span class="tab-name">Settings</span>
            <span class="tab-close" role="button" tabindex="0" aria-label="Close Settings" onclick={(e) => closeSettings(e)} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeSettings(); } }}></span>
          </button>
        {/if}
        {#if tabs.length === 0 && !settingsOpen && !agentSwarmOpen}
          <span class="tab active muted">Welcome</span>
        {:else}
          {#each tabs as tab (tab.path)}
            <button type="button" class="tab" class:active={view === "editor" && activeTabPath === tab.path} onclick={() => selectTab(tab.path)}>
              <span class="tab-badge" style="color: {fileMeta(tab.name).color}">{fileMeta(tab.name).label}</span>
              <span class="tab-name">{tab.name}</span>
              {#if isDirty(tab)}<span class="unsaved-dot" title="Unsaved changes"></span>{/if}
              <span class="tab-close" role="button" tabindex="0" aria-label="Close {tab.name}" onclick={(e) => closeTab(tab.path, e)} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeTab(tab.path, e as unknown as MouseEvent); } }}></span>
            </button>
          {/each}
        {/if}
      </div>

      <div class="editor-content">
      {#if saveError}
        <div class="save-error" transition:slide={slideY}>{saveError}</div>
      {/if}

      {#if folderRestricted && folderPath}
        <div class="restricted-banner" transition:slide={slideY}>
          <span class="restricted-banner-text">
            Restricted mode — browsing only. Terminals, agents, and file writes are disabled.
          </span>
          <button type="button" class="restricted-trust-btn" onclick={trustCurrentFolder}>
            Trust this folder
          </button>
        </div>
      {/if}

      {#key view}
      {#if view === "settings"}
        <div
          class="view-pane"
          in:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
          out:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
        >
          <Settings bind:settings />
        </div>
      {:else if view === "agents"}
        <div
          class="view-pane"
          in:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
          out:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
        >
          <ParallelAgents
            {settings}
            cwd={folderPath}
            bind:agents={parallelAgents}
            bind:goals={missionGoals}
            grokCommand={grokInjectCommand}
            grokCliAvailable={grokCliAvailable}
            onGrokCliMissing={() => {
              settingsNotice = "Install Grok CLI first — see the welcome screen or README for install commands.";
              closeAgentSwarm();
            }}
            onClose={closeAgentSwarm}
          />
        </div>
      {:else if activeTab}
        <div
          class="view-pane editor-view-pane"
          in:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
          out:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
        >
        {#if breadcrumbs.length > 1}
          <nav class="breadcrumbs" aria-label="File path">
            {#each breadcrumbs as seg, i (seg + i)}
              <span class="crumb">{seg}</span>
              {#if i < breadcrumbs.length - 1}<span class="crumb-sep">/</span>{/if}
            {/each}
          </nav>
        {/if}
        <div class="editor {editorClasses}" class:debug-paused={debugPaused} style={editorStyleVars}>
          {#if settings.stickyScroll && stickyHeaders.length > 0}
            <div class="sticky-scroll-bar" aria-hidden="true">
              {#each stickyHeaders as header, i (header + i)}
                <span class="sticky-header">{header}</span>
              {/each}
            </div>
          {/if}
          <div class="editor-scroll dark-scrollbar" bind:this={editorScrollEl}>
            <div class="editor-surface" class:wrap={settings.wordWrap}>
              {#if settings.showLineNumbers}
                <div class="line-numbers">
                  {#each editorLines as line (line.num)}
                    <span
                      class="line-num"
                      class:active={line.num === cursorLine}
                      class:debug-line={debugPaused && line.num === cursorLine}
                    >
                      {line.num}
                      {#if debugInlineHint && line.num === cursorLine}
                        <span class="inline-value" title="Inline debug value">{debugInlineHint}</span>
                      {/if}
                    </span>
                  {/each}
                </div>
              {/if}
              <div class="editor-input-wrap">
                <textarea
                  bind:this={editorTextarea}
                  class="code-textarea"
                  class:insert-spaces={settings.insertSpaces}
                  style="tab-size: {settings.insertSpaces ? settings.tabSize : 2}; height: {editorTextHeight}px"
                  readonly={folderRestricted}
                  value={activeTab.content}
                  oninput={(e) => { updateTabContent(e.currentTarget.value); syncCursor(e); }}
                  onkeydown={handleEditorKeydown}
                  onpaste={handleEditorPaste}
                  onfocus={hidePanelsOnEditorFocus}
                  onmousedown={handleEditorMouseDown}
                  onclick={handleEditorClick}
                  onkeyup={syncCursor}
                  spellcheck="false"
                  aria-label="Editor for {activeTab.name}"
                ></textarea>
                {#if showCollabCursors}
                  {#each mockCollaborators as collab (collab.name)}
                    <span
                      class="collab-cursor"
                      style="--collab-color: {collab.color}; top: calc(12px + ({collab.line - 1} * var(--elh))); left: calc(16px + {collab.col}ch)"
                      title="{collab.name}"
                    >
                      <span class="collab-label">{collab.name}</span>
                    </span>
                  {/each}
                {/if}
              </div>
            </div>
          </div>
        </div>
        </div>
      {:else}
        <div
          class="view-pane editor-view-pane"
          in:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
          out:fade={settings.enableAnimations ? fadeFast : { duration: 0 }}
        >
        <div class="editor-placeholder">
          <img class="welcome-logo" src="/favicon.png" alt="" width="40" height="40" />
          <h1 class="welcome-title">Grokden</h1>
          <p class="welcome-sub">A focused desktop IDE for building with AI.</p>
          {#if grokCliAvailable === false}
            <div class="welcome-grok-alert" role="alert">
              <p class="welcome-grok-title">Grok CLI not found on PATH</p>
              <p class="welcome-grok-desc">
                Grokden launches the official Grok CLI from your terminal. Install it, restart Grokden if needed, then verify with <code>grok --help</code>.
              </p>
              <div class="welcome-grok-installs">
                <div class="welcome-grok-install-block">
                  <span class="welcome-grok-platform">Windows (PowerShell)</span>
                  <code class="welcome-grok-cmd">{GROK_CLI_INSTALL_WINDOWS}</code>
                </div>
                <div class="welcome-grok-install-block">
                  <span class="welcome-grok-platform">macOS / Linux</span>
                  <code class="welcome-grok-cmd">{GROK_CLI_INSTALL_UNIX}</code>
                </div>
              </div>
              <button
                type="button"
                class="welcome-grok-recheck"
                disabled={grokCliChecking}
                onclick={() => void refreshGrokCliStatus()}
              >
                {grokCliChecking ? "Checking…" : "Check again"}
              </button>
            </div>
          {:else if grokCliChecking}
            <p class="welcome-grok-checking">Checking for Grok CLI…</p>
          {/if}
          <div class="welcome-actions">
            <button type="button" class="welcome-btn primary" onclick={openFolder}>Open Folder</button>
            <button type="button" class="welcome-btn" onclick={openAgentSwarm}>Parallel Agents</button>
            <button type="button" class="welcome-btn" onclick={launchGrokCli}>Launch Grok CLI</button>
          </div>
          <div class="welcome-hints">
            <span><kbd>Ctrl</kbd>+<kbd>S</kbd> Save</span>
            <span><kbd>Ctrl</kbd>+<kbd>B</kbd> Sidebar</span>
            <span><kbd>Ctrl</kbd>+<kbd>`</kbd> Terminal</span>
            <span><kbd>Ctrl</kbd>+<kbd>,</kbd> Settings</span>
          </div>
        </div>
        </div>
      {/if}
      {/key}
      </div>
    </main>

    {#if secondarySidebarOpen && !settings.zenMode}
      <aside class="secondary-sidebar" transition:slide={settings.enableAnimations ? slideX : { duration: 0 }}>
        <div class="secondary-header">
          <div class="secondary-tabs" role="tablist" aria-label="Secondary panel">
            <button type="button" role="tab" class="secondary-tab" class:active={secondaryPanelTab === "outline"} aria-selected={secondaryPanelTab === "outline"} onclick={() => (secondaryPanelTab = "outline")}>Outline</button>
            <button type="button" role="tab" class="secondary-tab" class:active={secondaryPanelTab === "activity"} aria-selected={secondaryPanelTab === "activity"} onclick={() => (secondaryPanelTab = "activity")}>
              Activity
              {#if activeAgentSession && isSessionLive(activeAgentSession)}
                <span class="activity-live-dot" aria-hidden="true"></span>
              {/if}
            </button>
          </div>
          <button type="button" class="secondary-close" aria-label="Hide secondary sidebar" onclick={() => setUserSecondaryOpen(false)}>Close</button>
        </div>
        {#if secondaryPanelTab === "outline"}
          <ul class="outline-list">
            {#if !activeTab}
              <li class="outline-empty">Open a file to see its outline.</li>
            {:else if outlineSymbols.length === 0}
              <li class="outline-empty">No symbols found in {activeTab.name}.</li>
            {:else}
              {#each outlineSymbols as symbol (symbol.name + ":" + symbol.line)}
                <li>
                  <button type="button" class="outline-item" onclick={() => jumpToLine(symbol.line, 1)}>
                    <span class="outline-kind">{symbol.kind}</span>
                    <span class="outline-name">{symbol.name}</span>
                    <span class="outline-line">:{symbol.line}</span>
                  </button>
                </li>
              {/each}
            {/if}
          </ul>
        {:else}
          <AgentActivityFeed />
        {/if}
      </aside>
    {/if}
    </div>

    {#if userTerminalOpen || settings.terminalPersistSession}
      <footer
        class="terminal"
        class:panel-side={settings.panelDefaultLocation !== "bottom"}
        class:panel-hidden={!terminalOpen}
        style={terminalOpen ? panelStyle : undefined}
      >
        <button
          type="button"
          class="terminal-resize-handle"
          class:resize-side={settings.panelDefaultLocation !== "bottom"}
          style:cursor={panelResizeCursor(settings.panelDefaultLocation)}
          aria-label="Resize terminal"
          onmousedown={startTerminalResize}
        ></button>
        <div class="terminal-header">
          <button type="button" class="terminal-tab" class:active={bottomPanelTab === "terminal"} onclick={() => selectBottomPanelTab("terminal")}>Terminal</button>
          <button type="button" class="terminal-tab" class:active={bottomPanelTab === "output"} onclick={() => selectBottomPanelTab("output")}>Output</button>
          <button type="button" class="terminal-tab" class:active={bottomPanelTab === "problems"} onclick={() => selectBottomPanelTab("problems")}>
            Problems{#if workspaceLintIssues.length > 0}<span class="tab-count">{workspaceLintIssues.length}</span>{/if}
          </button>
          <button type="button" class="terminal-tab" class:active={bottomPanelTab === "debug"} onclick={() => selectBottomPanelTab("debug")}>Debug</button>
          <button type="button" class="terminal-close" aria-label="Hide terminal" onclick={() => setUserTerminalOpen(false)}>Close</button>
        </div>
        <div class="terminal-body">
          <div
            class="terminal-pane"
            class:terminal-pane-hidden={bottomPanelTab !== "terminal"}
            aria-hidden={bottomPanelTab !== "terminal"}
          >
            <Terminal
              {settings}
              cwd={folderPath}
              sessionActive={userTerminalOpen && !folderRestricted}
              visible={terminalOpen && bottomPanelTab === "terminal" && view !== "agents" && !folderRestricted}
              enableHelper={false}
              injectToken={grokInjectToken}
              injectCommand={folderRestricted ? null : grokInjectCommand}
              onSpawned={handleMainTerminalSpawned}
            />
          </div>
          <div
            class="terminal-pane"
            class:terminal-pane-display-hidden={bottomPanelTab !== "output"}
            aria-hidden={bottomPanelTab !== "output"}
          >
            <pre class="output-panel">{outputPanelLines.join("\n")}</pre>
          </div>
          <div
            class="terminal-pane"
            class:terminal-pane-display-hidden={bottomPanelTab !== "problems"}
            aria-hidden={bottomPanelTab !== "problems"}
          >
            <div class="problems-panel">
              {#if workspaceLintIssues.length === 0}
                <div class="panel-stub">No problems detected.</div>
              {:else}
                <ul class="problems-list">
                  {#each workspaceLintIssues as issue (issue.path + ":" + issue.line + ":" + issue.message)}
                    <li class="problem-item" class:error={issue.severity === "error"}>
                      <button type="button" class="problem-link" onclick={() => jumpToLintIssue(issue)}>
                        <span class="problem-file">{issue.name}</span>
                        <span class="problem-detail">Ln {issue.line}: {issue.message}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
          <div
            class="terminal-pane"
            class:terminal-pane-display-hidden={bottomPanelTab !== "debug"}
            aria-hidden={bottomPanelTab !== "debug"}
          >
            <div class="debug-panel">
              <div class="debug-toolbar">
                <span class="debug-status" class:paused={debugPaused}>
                  {debugSessionActive ? (debugPaused ? "Paused" : "Running") : "Not running"}
                </span>
                <span class="debug-chip" title="Breakpoint behavior">{breakpointBehaviorLabel(settings)}</span>
                {#if settings.stepIntoFilters.trim()}
                  <span class="debug-chip" title="Step into filters">Filters: {settings.stepIntoFilters}</span>
                {/if}
                {#if !debugSessionActive}
                  <button type="button" class="debug-btn" onclick={startDebugSession}>Start</button>
                {:else}
                  <button type="button" class="debug-btn" onclick={() => simulateBreakpoint(false)}>Break</button>
                  <button type="button" class="debug-btn" onclick={() => simulateBreakpoint(true)}>Exception</button>
                  <button type="button" class="debug-btn" onclick={simulateStepInto}>Step Into</button>
                  <button type="button" class="debug-btn danger" onclick={stopDebugSession}>Stop</button>
                {/if}
              </div>
              <pre class="debug-console {debugConsoleClasses}">Debug console
Breakpoint behavior: {breakpointBehaviorLabel(settings)}
Open on break: {settings.debugOpenOnBreak ? "yes" : "no"}
Confirm on exit: {settings.debugConfirmOnExit ? "yes" : "no"}
Inline values: {settings.debugInlineValues ? "enabled" : "disabled"}
Word wrap: {settings.debugConsoleWordWrap ? "on" : "off"}
{debugPaused ? "Paused at breakpoint — inspect variables in the editor gutter." : "Waiting for breakpoint…"}
This is a very long debug log line that demonstrates whether the debug console word-wrap setting is applied at runtime when output exceeds the panel width.</pre>
            </div>
          </div>
        </div>
      </footer>
    {/if}
    </div>
  </div>

  <div class="statusbar" class:zen-hidden={settings.zenMode}>
    <div class="status-left">
      <span class="status-chip accent">{view === "agents" ? `Swarm · ${parallelAgents.length} agents` : view === "settings" ? "Settings" : activeTab ? "Editing" : "Ready"}</span>
      {#if folderPath}<span class="status-chip" title={folderPath}>{folderName}</span>{/if}
      {#if folderRestricted}<span class="status-chip warn" title="Trust the folder to enable terminals and agents">Restricted</span>{/if}
      {#if dirtyCount > 0}<span class="status-chip warn">{dirtyCount} unsaved</span>{/if}
      {#each scopedStatusChips as chip (chip.label)}
        <span
          class="status-chip"
          class:accent={chip.tone === "accent"}
          class:warn={chip.tone === "warn"}
          class:muted={chip.tone === "muted"}
        >{chip.label}</span>
      {/each}
    </div>
    <div class="status-right">
      {#if settings.experimentalFeatures}
        <span class="status-chip warn">Experimental</span>
      {/if}
      {#if settings.offlineMode}
        <span class="status-chip warn">Offline</span>
      {/if}
      {#if settings.liveShareEnabled}
        <span class="status-chip accent">Live Share</span>
      {/if}
      {#if showPresence}
        <span class="status-chip">{mockCollaborators.length} online</span>
      {/if}
      {#if debugSessionActive}
        <span class="status-chip accent">{debugPaused ? "Debug · Paused" : "Debug · Running"}</span>
      {/if}
      {#if formatNotice}
        <span class="status-chip accent" title="Format action">{formatNotice}</span>
      {/if}
      {#if view === "editor" && activeTab}
        <span class="status-chip">Ln {cursorLine}, Col {cursorCol}</span>
        <span class="status-chip">{editorLines.length} lines</span>
        <span class="status-chip">{languageOf(activeTab.name)}</span>
        <span class="status-chip" title="Font size / line height">{settings.fontSize}px / {settings.lineHeight}px</span>
        <span class="status-chip" title="Formatter">{editorStatus.formatter}</span>
        <span class="status-chip" title="Linter">{editorStatus.linter}{editorStatus.lintCount > 0 ? ` (${editorStatus.lintCount})` : ""}</span>
        <span class="status-chip" title="Keymap preset">{editorStatus.keymap}</span>
        {#if editorStatus.vimMode}
          <span class="status-chip accent">{editorStatus.vimMode}</span>
        {/if}
        {#if editorStatus.multiCursor > 1}
          <span class="status-chip accent">{editorStatus.multiCursor} cursors</span>
        {/if}
        {#each editorStatus.tools as tool (tool)}
          <span class="status-chip" title="Language tool path">{tool}</span>
        {/each}
        <span class="status-chip" title={settings.insertSpaces ? "Spaces" : "Tabs"}>Tab {settings.tabSize}{settings.insertSpaces ? "S" : "T"}</span>
        {#if settings.renderWhitespace !== "none"}
          <span class="status-chip">WS: {settings.renderWhitespace}</span>
        {/if}
        {#if settings.formatOnSave}<span class="status-chip">Fmt save</span>{/if}
        {#if settings.eslintAutoFixOnSave}<span class="status-chip">ESLint fix</span>{/if}
        {#each aiStatusChips as chip (chip.label)}
          <span
            class="status-chip"
            class:accent={chip.tone === "accent"}
            class:warn={chip.tone === "warn"}
            title={chip.title}
          >{chip.label}</span>
        {/each}
        <span class="status-chip">UTF-8</span>
      {:else if view === "agents"}
        <span class="status-chip accent">{parallelAgents.length} agent slot{parallelAgents.length === 1 ? "" : "s"}</span>
        <span class="status-chip" title="Grok model">{settings.grokModel}</span>
        {#if grokLaunching}
          <span class="status-chip accent">Launching Grok…</span>
        {/if}
        {#if grokCliAvailable === false}
          <span class="status-chip warn" title="Install Grok CLI before launching agents">Grok CLI missing</span>
        {/if}
      {:else}
        {#if grokCliAvailable === false}
          <span class="status-chip warn" title="Install Grok CLI before launching agents">Grok CLI missing</span>
        {/if}
        <span class="status-chip">{view === "settings" ? "Preferences" : grokLaunching ? "Launching Grok…" : "No file"}</span>
      {/if}
    </div>
  </div>

  <QuickOpen
    open={quickOpenVisible}
    onClose={() => (quickOpenVisible = false)}
    onOpenFile={openFile}
  />

  {#if folderTrustPendingPath}
    <FolderTrustDialog
      folderPath={folderTrustPendingPath}
      trustParent={folderTrustParent}
      onTrustParentChange={(value) => (folderTrustParent = value)}
      onTrust={() => void handleFolderTrustChoice("trusted")}
      onRestricted={() => void handleFolderTrustChoice("restricted")}
    />
  {/if}

</div>
{/if}

<style>
  :global(.phase-shell) {
    position: fixed;
    inset: 0;
    width: var(--app-width, 100vw);
    height: var(--app-height, 100dvh);
    max-width: var(--app-width, 100vw);
    max-height: var(--app-height, 100dvh);
    z-index: 15000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg, #09090d);
  }

  :global(.phase-shell > :not(.window-chrome)) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .workspace-enter {
    animation: workspace-in 0.4s ease-out both;
  }
  @keyframes workspace-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  :global(html, body) {
    margin: 0;
    padding: 0;
    position: fixed;
    inset: 0;
    width: var(--app-width, 100vw);
    height: var(--app-height, 100dvh);
    max-width: var(--app-width, 100vw);
    max-height: var(--app-height, 100dvh);
    overflow: hidden;
    overscroll-behavior: none;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    background: var(--bg, #09090d);
  }

  :global(#svelte) {
    position: fixed;
    inset: 0;
    width: var(--app-width, 100vw);
    height: var(--app-height, 100dvh);
    max-width: var(--app-width, 100vw);
    max-height: var(--app-height, 100dvh);
    overflow: hidden;
  }

  .ide {
    position: fixed;
    inset: 0;
    width: var(--app-width, 100vw);
    height: var(--app-height, 100dvh);
    max-width: var(--app-width, 100vw);
    max-height: var(--app-height, 100dvh);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--text-dim);
    overflow: hidden;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    padding: 0 14px;
    background: var(--panel-solid);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    -webkit-app-region: drag;
    app-region: drag;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    -webkit-app-region: drag;
    app-region: drag;
  }

  .logo-img {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    flex-shrink: 0;
    opacity: 0.95;
  }

  .app-name { font-size: 13px; font-weight: 500; letter-spacing: 0.02em; color: var(--text); }

  .version-pill {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-mute);
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--chip-bg);
    border: 1px solid var(--border);
  }

  .command-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 26px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--chip-bg);
    border: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-mute);
    min-width: 200px;
    justify-content: center;
  }

  .command-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
  .command-badge { font-size: 10px; font-weight: 400; color: var(--warn); background: var(--warn-soft); padding: 1px 6px; border-radius: 4px; }
  .command-badge.grok-cli-missing { color: var(--warn); background: var(--warn-soft); }
  .command-badge.share-badge { color: var(--accent); background: var(--accent-soft); }
  .presence-strip { display: inline-flex; align-items: center; gap: 4px; }
  .presence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--border);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .save-btn,
  .launch-btn {
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-dim);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, opacity 0.12s;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
  .save-btn:hover:not(:disabled),
  .launch-btn:hover:not(:disabled) { background: var(--hover); color: var(--text); }
  .save-btn:disabled,
  .launch-btn:disabled { opacity: 0.35; cursor: default; }
  .launch-btn { color: var(--text-dim); }
  .launch-btn.launching { opacity: 0.5; cursor: wait; }
  .launch-btn.swarm-btn.active {
    background: var(--hover);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .rail-live {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
  }

  .workspace {
    display: flex;
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    align-self: stretch;
  }

  .workspace-body {
    position: relative;
    flex: 1 1 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    isolation: isolate;
  }

  .workspace-body.terminal-docked-bottom {
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .workspace-body.terminal-docked-bottom > .terminal:not(.panel-side) {
    grid-row: 2;
    grid-column: 1;
  }

  .workspace-body.terminal-docked-side {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: minmax(0, 1fr);
  }

  .workspace-panels {
    grid-row: 1;
    grid-column: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    align-self: stretch;
  }

  .workspace-body:not(.terminal-docked-bottom):not(.terminal-docked-side) > .terminal.panel-hidden {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }

  .workspace-panels.sidebar-right {
    flex-direction: row-reverse;
  }

  .workspace-panels.sidebar-right .sidebar {
    border-right: none;
    border-left: 1px solid var(--border);
  }

  .workspace-panels.sidebar-right .secondary-sidebar {
    border-left: none;
    border-right: 1px solid var(--border);
  }

  .activity-rail {
    width: var(--rail-width, 40px);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 6px 0;
    background: var(--panel-solid);
    border-right: 1px solid var(--border);
    z-index: 2;
  }

  .rail-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--text-mute);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    transition: color 0.12s;
  }
  .rail-svg {
    width: 16px;
    height: 16px;
    display: block;
    opacity: 0.65;
    transition: opacity 0.12s;
  }
  .rail-btn:hover .rail-svg,
  .rail-btn.active .rail-svg { opacity: 1; }
  .rail-btn:hover { color: var(--text-dim); }
  .rail-btn.active { color: var(--text); }
  .rail-btn.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 9px;
    bottom: 9px;
    width: 2px;
    border-radius: 0 1px 1px 0;
    background: var(--accent);
    opacity: 0.75;
  }
  .rail-hint {
    position: absolute;
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 400;
    color: var(--text-dim);
    background: var(--panel-solid);
    border: 1px solid var(--border);
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.1s;
    z-index: 20;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }
  .rail-btn:hover .rail-hint,
  .rail-btn:focus-visible .rail-hint { opacity: 1; }
  .rail-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 11px;
    height: 11px;
    padding: 0 2px;
    border-radius: 6px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 7px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .rail-spacer { flex: 1; }

  .sidebar {
    /* Fixed 280px (SIDEBAR_DEFAULT): reconcile zeroes --sidebar-width on close while
       the slide-outro is still running, which collapsed this element and caused flicker. */
    width: 280px;
    flex-shrink: 0;
    background: var(--panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 8px; flex-shrink: 0; }
  .sidebar-header span { font-size: 11px; font-weight: 500; letter-spacing: 0.04em; color: var(--text-mute); }

  .open-folder-btn {
    padding: 2px 0;
    font-size: 11px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.12s;
  }
  .open-folder-btn:hover { color: var(--accent); }

  .explorer-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px 8px;
    flex-shrink: 0;
  }
  .toolbar-link {
    padding: 0;
    font-size: 11px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.12s;
  }
  .toolbar-link:hover:not(:disabled) { color: var(--text); }
  .toolbar-link:disabled { opacity: 0.35; cursor: default; }

  .folder-path {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 12px 8px;
    font-size: 11px;
    font-weight: 400;
    color: var(--text-mute);
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }
  .chevron {
    display: inline-block;
    width: 0;
    height: 0;
    border-top: 3px solid transparent;
    border-bottom: 3px solid transparent;
    border-left: 4px solid var(--text-mute);
    flex-shrink: 0;
    transition: transform 0.15s ease, border-color 0.15s;
  }
  .chevron.open { transform: rotate(90deg); border-left-color: var(--accent); }
  .chevron.loading {
    width: 8px;
    height: 8px;
    border: none;
    border-radius: 50%;
    background: var(--text-mute);
    opacity: 0.5;
    animation: pulse-dot 1s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 0.8; }
  }
  .tree-chevron { margin-right: 2px; }

  .file-tree { list-style: none; margin: 0; padding: 0 6px; overflow-y: auto; flex: 1; }
  .tree-empty { padding: 8px 12px; font-size: 12px; color: var(--text-mute); font-style: italic; }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 5px 10px;
    font-size: 13px;
    color: var(--text-dim);
    user-select: none;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    border-radius: 7px;
    transition: background 0.12s, color 0.12s, transform 0.08s;
  }
  .tree-item.clickable, .tree-item.folder { cursor: pointer; }
  .tree-item.folder { color: var(--text); font-weight: 400; }
  .tree-item.folder:hover, .tree-item.clickable:hover { background: var(--hover); }
  .tree-item.folder.loading { color: var(--text-mute); }
  .tree-item.folder.selected { background: var(--hover); }
  .tree-item.active { background: var(--accent-soft); color: var(--text); box-shadow: inset 2px 0 0 var(--accent); }
  .tree-item.non-text-file { color: var(--text-mute); cursor: default; }

  .file-badge { width: 18px; font-size: 9px; font-weight: 500; letter-spacing: -0.3px; text-align: center; flex-shrink: 0; }
  .file-badge.muted { color: var(--text-mute); }

  .tree-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .editor-area {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 100%;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    background: var(--editor-bg);
    isolation: isolate;
  }

  .editor-content {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .view-pane {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    height: 100%;
    overflow: hidden;
  }

  .editor-content > .view-pane,
  .editor-content > :global(.settings-view),
  .editor-content :global(.swarm) {
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    height: 32px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    overflow-x: auto;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 8px 0 12px;
    font-size: 12px;
    color: var(--text-mute);
    border: none;
    border-right: 1px solid var(--border);
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    height: 100%;
    position: relative;
    transition: color 0.15s, background 0.15s;
  }
  .tab:hover { background: var(--hover); color: var(--text-dim); }
  .tab.active {
    background: var(--editor-bg);
    color: var(--text);
    font-weight: 400;
  }
  .tab.active::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 1px;
    background: var(--accent);
  }
  .tab.muted { color: var(--text-mute); cursor: default; }
  .tab-badge { font-size: 9px; font-weight: 500; letter-spacing: -0.3px; flex-shrink: 0; }
  .tab-badge.settings-badge { color: var(--accent); }
  .tab-badge.swarm-badge { color: var(--success); }
  .tab-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .unsaved-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--warn);
    flex-shrink: 0;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    flex-shrink: 0;
    transition: background 0.12s;
    position: relative;
  }
  .tab-close::before,
  .tab-close::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 1.5px;
    background: var(--text-mute);
    border-radius: 1px;
    transition: background 0.12s;
  }
  .tab-close::before { transform: rotate(45deg); }
  .tab-close::after { transform: rotate(-45deg); }
  .tab-close:hover { background: var(--hover); }
  .tab-close:hover::before,
  .tab-close:hover::after { background: var(--text-dim); }

  .save-error {
    padding: 7px 14px;
    font-size: 12px;
    color: var(--danger);
    background: var(--danger-soft);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .restricted-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    font-size: 12px;
    color: var(--warn);
    background: rgba(251, 191, 36, 0.08);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .restricted-banner-text {
    flex: 1;
    min-width: 0;
    line-height: 1.4;
  }

  .restricted-trust-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    font-size: 11px;
    font-family: inherit;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent-mid);
    border-radius: 5px;
    cursor: pointer;
  }

  .restricted-trust-btn:hover {
    background: var(--accent-mid);
  }

  .editor {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--editor-bg);
    font-family: var(--code-font);
    font-size: var(--efs);
    line-height: var(--elh);
    font-weight: 400;
  }

  .editor-scroll {
    flex: 1;
    min-width: 0;
    min-height: 0;
    width: 100%;
    overflow: auto;
    background: var(--editor-bg);
  }

  .editor-surface {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
    min-width: 0;
    min-height: 100%;
    box-sizing: border-box;
  }

  .ide.centered-layout .editor-surface {
    max-width: min(100ch, 100%);
    margin: 0 auto;
  }

  .ide.centered-layout .editor-scroll {
    display: flex;
    justify-content: center;
  }

  .editor-placeholder {
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 4px;
    padding: 28px 32px;
    overflow: auto;
    background: var(--editor-bg);
    color: var(--text-mute);
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  }
  .welcome-logo {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  }
  .welcome-title {
    margin: 8px 0 0;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: var(--text);
  }
  .welcome-sub { margin: 0 0 10px; font-size: 12px; color: var(--text-mute); }
  .welcome-grok-checking {
    margin: 0 0 14px;
    font-size: 12px;
    color: var(--text-mute);
  }
  .welcome-grok-alert {
    width: min(520px, 92vw);
    margin: 0 0 16px;
    padding: 14px 16px;
    text-align: left;
    border: 1px solid var(--warn);
    border-radius: 8px;
    background: var(--warn-soft);
  }
  .welcome-grok-title {
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--warn);
  }
  .welcome-grok-desc {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-dim);
  }
  .welcome-grok-desc code {
    font-family: var(--code-font);
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 4px;
    background: var(--hover);
  }
  .welcome-grok-installs {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
  }
  .welcome-grok-install-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .welcome-grok-platform {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-mute);
  }
  .welcome-grok-cmd {
    display: block;
    padding: 8px 10px;
    font-family: var(--code-font);
    font-size: 11px;
    line-height: 1.4;
    color: var(--text);
    word-break: break-all;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
  .welcome-grok-recheck {
    padding: 5px 12px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    cursor: pointer;
  }
  .welcome-grok-recheck:hover:not(:disabled) {
    background: var(--hover);
    border-color: var(--text-mute);
  }
  .welcome-grok-recheck:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .welcome-actions { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .welcome-btn {
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-mute);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .welcome-btn:hover { color: var(--text); border-color: var(--text-mute); background: var(--hover); }
  .welcome-btn.primary { color: var(--accent); border-color: var(--accent-mid); }
  .welcome-btn.primary:hover { color: var(--text); background: var(--accent-soft); }
  .welcome-hints { display: flex; gap: 12px; font-size: 10px; color: var(--text-mute); flex-wrap: wrap; }
  .welcome-hints kbd {
    font-family: inherit;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--hover);
    border: 1px solid var(--border);
    color: var(--text-dim);
  }

  .line-numbers {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 48px;
    padding: 12px 8px 12px 4px;
    text-align: right;
    user-select: none;
    background: var(--editor-bg);
    border-right: 1px solid var(--border);
    box-sizing: border-box;
  }
  .line-num {
    position: relative;
    padding: 0 8px 0 12px;
    color: var(--text-mute);
    opacity: 0.55;
    line-height: var(--elh);
    transition: color 0.12s, opacity 0.12s;
  }
  .line-num.active { color: var(--text); opacity: 1; font-weight: 400; }
  .line-num.debug-line { background: var(--warn-soft); border-radius: 3px; }
  .inline-value {
    position: absolute;
    left: 0;
    top: 100%;
    display: block;
    font-size: 9px;
    font-weight: 400;
    color: var(--accent);
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    pointer-events: none;
  }

  .editor-input-wrap {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    display: block;
  }
  .editor.debug-paused .code-textarea { outline: 1px solid var(--warn); outline-offset: -1px; }
  .collab-cursor {
    position: absolute;
    width: 2px;
    height: var(--elh);
    background: var(--collab-color);
    pointer-events: none;
    z-index: 2;
  }
  .collab-label {
    position: absolute;
    top: -14px;
    left: 0;
    padding: 1px 4px;
    font-size: 9px;
    color: #fff;
    background: var(--collab-color);
    border-radius: 3px 3px 3px 0;
    white-space: nowrap;
  }

  .code-textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 12px 16px 12px 12px;
    margin: 0;
    color: var(--text);
    background: var(--editor-bg);
    border: none;
    outline: none;
    resize: none;
    overflow-x: auto;
    overflow-y: hidden;
    font-family: inherit;
    font-size: inherit;
    font-weight: 400;
    line-height: var(--elh);
    tab-size: var(--etab);
    white-space: pre;
    caret-color: var(--accent);
    text-shadow: none;
    scrollbar-width: thin;
    scrollbar-color: rgba(121, 121, 121, 0.45) transparent;
  }

  .code-textarea::-webkit-scrollbar {
    height: 10px;
  }

  .code-textarea::-webkit-scrollbar-track {
    background: transparent;
  }

  .code-textarea::-webkit-scrollbar-thumb {
    background: rgba(121, 121, 121, 0.45);
    border: 2px solid transparent;
    border-radius: 5px;
    background-clip: padding-box;
  }

  .editor-surface.wrap .code-textarea {
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .code-textarea.insert-spaces { tab-size: var(--tab-space, var(--etab)); }
  .editor.use-tab-chars .code-textarea { tab-size: 4; }
  .editor.vim-mode .code-textarea { caret-color: var(--success); }
  .editor.ai-inline-suggestions .editor-input-wrap {
    box-shadow: inset 3px 0 0 var(--accent-soft);
  }

  .terminal {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--editor-bg);
    border-top: 1px solid var(--border);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .ide:not(.no-animations) .terminal:not(.panel-hidden) {
    transition: height 0.2s ease, width 0.2s ease;
  }

  .workspace-body.terminal-docked-side.panel-left {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .workspace-body.terminal-docked-side .terminal.panel-side {
    grid-row: 1;
    grid-column: 2;
    display: grid;
    grid-template-columns: 5px minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    border-top: none;
    border-left: 1px solid var(--border);
    height: 100%;
    min-width: 0;
    max-height: none;
  }

  .workspace-body.terminal-docked-side.panel-left .terminal.panel-side {
    grid-template-columns: minmax(0, 1fr) 5px;
    grid-column: 1;
    border-left: none;
    border-right: 1px solid var(--border);
  }

  .workspace-body.terminal-docked-side.panel-left .workspace-panels {
    grid-column: 2;
  }

  .terminal.panel-side .terminal-header {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
  }

  .terminal.panel-side .terminal-body {
    grid-column: 2;
    grid-row: 2;
    min-height: 0;
    min-width: 0;
  }

  .workspace-body.terminal-docked-side.panel-left .terminal.panel-side .terminal-header,
  .workspace-body.terminal-docked-side.panel-left .terminal.panel-side .terminal-body {
    grid-column: 1;
  }

  .terminal-resize-handle {
    flex-shrink: 0;
    width: 100%;
    height: 5px;
    padding: 0;
    border: none;
    border-top: 1px solid var(--border);
    cursor: ns-resize;
    background: transparent;
    transition: background 0.12s;
  }

  .terminal-resize-handle.resize-side {
    grid-row: 1 / -1;
    grid-column: 1;
    width: 5px;
    height: auto;
    min-height: 0;
    align-self: stretch;
    border-top: none;
    border-right: 1px solid var(--border);
    cursor: ew-resize;
  }

  .workspace-body.terminal-docked-side.panel-left .terminal.panel-side .terminal-resize-handle.resize-side {
    grid-column: 2;
    border-right: none;
    border-left: 1px solid var(--border);
  }

  .terminal-resize-handle:hover {
    background: var(--accent-soft);
    border-top-color: var(--accent-mid);
  }

  .terminal-resize-handle.resize-side:hover {
    border-top-color: transparent;
    border-right-color: var(--accent-mid);
  }

  .workspace-body.terminal-docked-side.panel-left .terminal.panel-side .terminal-resize-handle.resize-side:hover {
    border-right-color: transparent;
    border-left-color: var(--accent-mid);
  }

  .terminal-header {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 2px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    min-width: 0;
    overflow-x: auto;
    overflow-x: auto;
  }
  .terminal-tab {
    display: flex;
    align-items: center;
    padding: 0 12px;
    height: 100%;
    font-size: 11px;
    color: var(--text-mute);
    background: none;
    border: none;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.12s;
  }
  .terminal-tab:hover { color: var(--text-dim); }
  .terminal-tab.active { color: var(--text); border-bottom: 2px solid var(--accent); margin-bottom: -1px; }
  .tab-count {
    margin-left: 6px;
    padding: 0 5px;
    font-size: 10px;
    border-radius: 8px;
    background: var(--warn-soft);
    color: var(--warn);
  }

  .panel-stub {
    flex: 1;
    padding: 12px 16px;
    font-size: 12px;
    color: var(--text-mute);
    font-style: italic;
  }

  .output-panel {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 12px 16px;
    font-family: "Cascadia Mono", Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-dim);
    white-space: pre-wrap;
    overflow: auto;
    background: transparent;
    border: none;
  }

  .debug-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .debug-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    flex-shrink: 0;
  }
  .debug-status {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-dim);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--chip-bg);
  }
  .debug-status.paused { color: var(--warn); background: var(--warn-soft); }
  .debug-chip {
    font-size: 10px;
    color: var(--text-mute);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
  }
  .debug-btn {
    padding: 3px 10px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-dim);
    background: var(--chip-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .debug-btn:hover { background: var(--hover); color: var(--text); }
  .debug-btn.danger:hover { color: var(--danger); border-color: var(--danger); }
  .debug-console {
    flex: 1;
    margin: 0;
    padding: 10px 14px;
    font-family: var(--code-font);
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-dim);
    background: var(--editor-bg);
    overflow: auto;
    white-space: pre;
  }
  .debug-console.debug-wrap {
    white-space: pre-wrap;
    word-break: break-word;
  }
  .terminal-close {
    margin-left: auto;
    margin-right: 8px;
    padding: 2px 8px;
    border: none;
    background: none;
    color: var(--text-mute);
    font-size: 11px;
    font-family: inherit;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .terminal-close:hover { background: var(--hover); color: var(--text); }
  .terminal-body {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    overflow: hidden;
    position: relative;
  }
  .terminal-pane {
    grid-area: 1 / 1;
    position: relative;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .terminal-pane.terminal-pane-hidden {
    visibility: hidden;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .terminal-pane.terminal-pane-display-hidden {
    display: none;
  }

  .terminal-pane:not(.terminal-pane-hidden):not(.terminal-pane-display-hidden) {
    z-index: 1;
  }

  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    padding: 0 12px;
    flex: 0 0 auto;
    flex-shrink: 0;
    background: var(--panel-solid);
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-mute);
  }
  .status-left, .status-right { display: flex; align-items: center; gap: 6px; }
  .status-chip { padding: 1px 8px; border-radius: 4px; white-space: nowrap; }
  .status-chip.accent { color: var(--accent); font-weight: 400; }
  .status-chip.warn { color: var(--warn); background: var(--warn-soft); }
  .status-chip.muted { color: var(--text-mute); background: var(--chip-bg); font-size: 10px; }
  .status-left { flex-wrap: wrap; row-gap: 2px; max-width: 55%; overflow: hidden; }
  .command-badge.settings-notice { color: var(--accent); border-color: var(--accent-mid); }

  .ide { opacity: var(--ui-opacity, 1); }
  .ide.no-animations :global(*) { transition: none !important; animation: none !important; }
  .ide.titlebar-hidden .topbar { display: none; }
  .ide.titlebar-native .topbar {
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    -webkit-app-region: drag;
  }
  .ide.titlebar-native .topbar-actions,
  .ide.titlebar-native .open-folder-btn,
  .ide.titlebar-native .save-btn,
  .ide.titlebar-native .launch-btn { -webkit-app-region: no-drag; }
  .ide.titlebar-native .logo-img { display: none; }
  .ide.titlebar-native .app-name { font-size: 12px; font-weight: 400; color: var(--text-dim); }
  .ide.zen-mode .topbar { opacity: 0.6; }

  .ide.density-compact .topbar { height: 32px; }
  .ide.density-compact .tab-bar { height: 32px; }
  .ide.density-compact .statusbar { height: 20px; }
  .ide.density-compact .activity-rail { width: 42px; }
  .ide.density-spacious .topbar { height: 48px; }
  .ide.density-spacious .tab-bar { height: 42px; }
  .ide.density-spacious .statusbar { height: 28px; font-size: 12px; }
  .ide.density-spacious .sidebar-header { padding: 12px 14px; }
  .ide.icon-minimal .file-badge { opacity: 0.55; font-size: 8px; letter-spacing: 0; }
  .ide.icon-minimal .rail-svg { opacity: 0.45; }
  .ide.icon-minimal .tab-badge { opacity: 0.7; }
  .ide.icon-colored .file-badge {
    background: var(--chip-bg);
    border-radius: 3px;
    padding: 1px 3px;
    font-weight: 600;
  }
  .ide.icon-colored .tab-badge { font-weight: 600; }

  .workspace.sidebar-right { flex-direction: row-reverse; }

  .workspace-panels.secondary-open {
    display: flex;
    min-width: 0;
    flex: 1;
  }

  .secondary-sidebar {
    width: 240px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--panel);
    border-left: 1px solid var(--border);
    overflow: hidden;
    contain: layout paint style;
  }

  .secondary-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 8px 10px 10px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--text-mute);
    border-bottom: 1px solid var(--border);
  }

  .secondary-tabs {
    display: flex;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .secondary-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: var(--text-mute);
    font-size: 11px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0.02em;
  }

  .secondary-tab.active {
    color: var(--text);
    background: var(--chip-bg);
  }

  .secondary-tab:hover:not(.active) {
    color: var(--text-dim);
    background: var(--hover);
  }

  .activity-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
  }

  .secondary-close {
    border: none;
    background: none;
    color: var(--text-mute);
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
  }

  .secondary-close:hover { color: var(--text); }

  .outline-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
    flex: 1;
  }

  .outline-empty {
    padding: 12px;
    font-size: 12px;
    color: var(--text-mute);
    font-style: italic;
  }

  .outline-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 8px;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
  }

  .outline-item:hover { background: var(--accent-soft); }
  .outline-kind {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--accent);
    min-width: 42px;
  }
  .outline-name { font-size: 12px; color: var(--text-dim); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .outline-line { font-size: 10px; color: var(--text-mute); }

  .tree-file-row {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }

  .tree-file-row .tree-item.file {
    flex: 1;
    min-width: 0;
    padding-left: 0;
  }

  .nest-chevron,
  .nest-spacer {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .nest-chevron {
    border: none;
    background: none;
    cursor: pointer;
    position: relative;
  }

  .nest-chevron::before {
    content: "";
    position: absolute;
    top: 4px;
    left: 5px;
    border: 4px solid transparent;
    border-left-color: var(--text-mute);
    transition: transform 0.12s;
  }

  .nest-chevron.open::before {
    transform: rotate(90deg) translate(1px, 1px);
  }

  .terminal.panel-hidden {
    display: none !important;
  }

  .zen-hidden { display: none !important; }
  .rail-btn:disabled { opacity: 0.3; pointer-events: none; }

  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    font-size: 11px;
    color: var(--text-mute);
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .crumb { color: var(--text-dim); }
  .crumb:last-child { color: var(--accent); }
  .crumb-sep { opacity: 0.5; }

  .sticky-scroll-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 4px 16px;
    background: color-mix(in srgb, var(--panel-solid) 92%, transparent);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(4px);
    pointer-events: none;
  }
  .sticky-header {
    font-size: 11px;
    color: var(--text-dim);
    font-family: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .editor.sticky-scroll .editor-scroll { padding-top: 28px; }

  .editor.scroll-beyond .editor-scroll { padding-bottom: 40vh; }
  .editor.smooth-scroll .editor-scroll { scroll-behavior: smooth; }

  :global(.dark-scrollbar) {
    scrollbar-color: rgba(121, 121, 121, 0.45) transparent;
    scrollbar-width: thin;
  }
  :global(.dark-scrollbar::-webkit-scrollbar) {
    width: 10px;
    height: 10px;
  }
  :global(.dark-scrollbar::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.dark-scrollbar::-webkit-scrollbar-thumb) {
    background: rgba(121, 121, 121, 0.45);
    border: 2px solid transparent;
    border-radius: 5px;
    background-clip: padding-box;
  }
  :global(.dark-scrollbar::-webkit-scrollbar-thumb:hover) {
    background: rgba(121, 121, 121, 0.65);
    background-clip: padding-box;
  }
  :global(.dark-scrollbar::-webkit-scrollbar-corner) {
    background: transparent;
  }

  .editor.cursor-block .code-textarea { caret-shape: block; }
  .editor.cursor-underline .code-textarea { caret-shape: underscore; }
  .editor.cursor-line .code-textarea { caret-shape: bar; }
  .editor.cursor-solid .code-textarea { caret-color: var(--accent); animation: none; }
  .editor.cursor-smooth .code-textarea { animation: cursor-blink-smooth 1.2s ease-in-out infinite; }
  .editor.cursor-phase .code-textarea { animation: cursor-blink-phase 1s step-end infinite; }
  .editor:not(.cursor-solid):not(.cursor-smooth):not(.cursor-phase) .code-textarea {
    animation: cursor-blink 1s step-end infinite;
  }

  @keyframes cursor-blink {
    0%, 100% { caret-color: var(--accent); }
    50% { caret-color: transparent; }
  }
  @keyframes cursor-blink-smooth {
    0%, 45% { caret-color: var(--accent); }
    55%, 100% { caret-color: transparent; }
  }
  @keyframes cursor-blink-phase {
    0%, 30% { caret-color: var(--accent); }
    31%, 60% { caret-color: color-mix(in srgb, var(--accent) 40%, transparent); }
    61%, 100% { caret-color: transparent; }
  }

  .problems-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    overflow: auto;
  }
  .problems-list { list-style: none; margin: 0; padding: 0; }
  .problem-item { border-bottom: 1px solid var(--border); }
  .problem-link {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: none;
    text-align: left;
    font: inherit;
    font-size: 12px;
    color: var(--warn);
    cursor: pointer;
  }
  .problem-file {
    flex-shrink: 0;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-dim);
  }
  .problem-detail { min-width: 0; }
  .problem-link:hover { background: var(--hover); }
  .problem-item.error .problem-link { color: var(--danger); }
  .problem-item.error .problem-file { color: var(--danger); }

  .panel-empty-git {
    padding: 14px 12px;
    font-size: 12px;
    color: var(--text-mute);
    font-style: italic;
    line-height: 1.5;
  }
</style>
