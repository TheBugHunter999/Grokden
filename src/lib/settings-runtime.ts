import {
  buildEditorStyleVars,
  hexToRgba,
  isTextFile,
  THEMES,
  type AppSettings,
  type PanelLocation,
  type SearchMatch,
} from "$lib/editor-utils";

export { buildEditorStyleVars };

export {
  PANEL_MIN_SIZE,
  PANEL_MAX_SIZE,
  PANEL_MAX_RATIO,
  MIN_MAIN_AREA,
  clampPanelSize,
  panelWorkspaceSpan,
} from "$lib/layout/solver";

/** RegExp that never matches — used when glob compilation fails. */
const NEVER_MATCH = /(?!)/;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/** Glob-like pattern → RegExp (supports `**`, `*`, `?`). */
export function globToRegExp(pattern: string | null | undefined): RegExp {
  const trimmed = (pattern ?? "").trim();
  if (!trimmed) return /^$/;

  let regex = "^";
  let i = 0;
  let lastSegmentHasWildcard = false;
  let lastSegmentLiteral = "";

  const flushSegment = () => {
    lastSegmentLiteral = "";
    lastSegmentHasWildcard = false;
  };

  while (i < trimmed.length) {
    const ch = trimmed[i];
    const next = trimmed[i + 1];

    if (ch === "*" && next === "*") {
      i += 2;
      if (trimmed[i] === "/") {
        regex += "(?:.*/)*";
        i++;
        flushSegment();
      } else {
        regex += ".*";
        lastSegmentHasWildcard = true;
      }
      continue;
    }
    if (ch === "*") {
      regex += "[^/]*";
      lastSegmentHasWildcard = true;
      i++;
      continue;
    }
    if (ch === "?") {
      regex += "[^/]";
      lastSegmentHasWildcard = true;
      i++;
      continue;
    }
    if (ch === "/") {
      regex += "/";
      flushSegment();
      i++;
      continue;
    }
    if (".+^${}()|[]\\".includes(ch)) {
      regex += "\\" + ch;
    } else {
      regex += ch;
      lastSegmentLiteral += ch;
    }
    i++;
  }

  const endsWithRecursiveGlob = /\/\*\*$/.test(trimmed) || /\*\*$/.test(trimmed);
  if (
    !endsWithRecursiveGlob &&
    !lastSegmentHasWildcard &&
    lastSegmentLiteral &&
    !trimmed.endsWith("/")
  ) {
    regex += "(?:/.*)?";
  }

  regex += "$";
  try {
    return new RegExp(regex, "i");
  } catch {
    return NEVER_MATCH;
  }
}

export function parsePatterns(raw: string | null | undefined): RegExp[] {
  return (raw ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map(globToRegExp);
}

export function pathMatchesAny(path: string | null | undefined, patterns: RegExp[]): boolean {
  if (!path || patterns.length === 0) return false;
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  const name = segments[segments.length - 1] ?? normalized;
  return patterns.some((re) => {
    if (re.test(normalized)) return true;
    if (re.test(name)) return true;
    let prefix = "";
    for (const seg of segments) {
      prefix = prefix ? `${prefix}/${seg}` : seg;
      if (re.test(prefix) || re.test(seg)) return true;
    }
    return false;
  });
}

export function isPathExcluded(path: string, settings: AppSettings): boolean {
  return pathMatchesAny(path, parsePatterns(settings.filesExcludePatterns));
}

export function isSearchExcluded(path: string, settings: AppSettings): boolean {
  if (!settings.searchIncludeIgnored && pathMatchesAny(path, parsePatterns(settings.filesExcludePatterns))) {
    return true;
  }
  return pathMatchesAny(path, parsePatterns(settings.searchExcludePatterns));
}

export function lineMatchesQuery(
  line: string | null | undefined,
  query: string | null | undefined,
  settings: AppSettings,
): boolean {
  if (line == null) return false;
  const q = (query ?? "").trim();
  if (!q) return false;

  const flags = settings.searchCaseSensitive ? "" : "i";

  if (settings.searchUseRegex) {
    try {
      if (settings.searchWholeWord) {
        return new RegExp(`(?:^|[^\\w$])(?:${q})(?:[^\\w$]|$)`, flags).test(line);
      }
      return new RegExp(q, flags).test(line);
    } catch {
      return false;
    }
  }

  if (settings.searchWholeWord) {
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|[^\\w$])${escaped}(?:[^\\w$]|$)`, flags).test(line);
    } catch {
      return false;
    }
  }

  if (settings.searchCaseSensitive) {
    return line.includes(q);
  }
  return line.toLowerCase().includes(q.toLowerCase());
}

export function nameMatchesQuery(name: string, query: string, settings: AppSettings): boolean {
  return lineMatchesQuery(name, query, settings);
}

export function isSearchRegexValid(query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  try {
    new RegExp(q);
    return true;
  } catch {
    return false;
  }
}

export function searchResultDirLabel(filePath: string): string {
  const normalized = filePath.replace(/[/\\]+$/, "");
  const index = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (index <= 0) return "";
  return normalized.slice(0, index);
}

export type SearchFileHit = { name: string; path: string };

export function computeSearch<
  TNode extends { path: string; name: string; isDir: boolean },
  TTab extends { path: string; name: string; content: string },
>(
  query: string,
  tabList: readonly TTab[],
  nodes: readonly TNode[],
  settings: AppSettings,
  isText: (name: string) => boolean = isTextFile,
): { files: SearchFileHit[]; matches: SearchMatch[] } {
  const q = query.trim();
  if (!q) return { files: [], matches: [] };

  const files = nodes
    .filter(
      (n) =>
        !n.isDir &&
        isText(n.name) &&
        !isSearchExcluded(n.path, settings) &&
        nameMatchesQuery(n.name, q, settings),
    )
    .slice(0, 50)
    .map((n) => ({ name: n.name, path: n.path }));

  const matches: SearchMatch[] = [];
  for (const tab of tabList) {
    if (isSearchExcluded(tab.path, settings)) continue;
    const lines = tab.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lineMatchesQuery(lines[i], q, settings)) {
        matches.push({
          path: tab.path,
          name: tab.name,
          line: i + 1,
          text: lines[i].trim().slice(0, 120),
        });
        if (matches.length >= 100) break;
      }
    }
    if (matches.length >= 100) break;
  }

  return { files, matches };
}

export type IdeLayoutClasses = {
  ide: string;
  workspace: string;
  workspaceBody: string;
  workspacePanels: string;
};

/** Effective sidebar side — right if either `sidebarLocation` or `sidebarPosition` is `"right"`. */
export function effectiveSidebarSide(settings: AppSettings): "left" | "right" {
  if (settings.sidebarLocation === "right" || settings.sidebarPosition === "right") return "right";
  return "left";
}

export const UI_LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Francais",
  es: "Espanol",
  ja: "Japanese",
};

export function buildIdeLayoutClasses(settings: AppSettings): IdeLayoutClasses {
  const classes: IdeLayoutClasses = {
    ide: "",
    workspace: "",
    workspaceBody: "",
    workspacePanels: "",
  };

  if (settings.zenMode) classes.ide += " zen-mode";
  if (settings.centeredLayout) classes.ide += " centered-layout";
  if (settings.uiDensity === "compact") classes.ide += " density-compact";
  else if (settings.uiDensity === "spacious") classes.ide += " density-spacious";
  if (!settings.enableAnimations) classes.ide += " no-animations";
  if (settings.titleBarStyle === "hidden") classes.ide += " titlebar-hidden";
  else if (settings.titleBarStyle === "native") classes.ide += " titlebar-native";
  if (effectiveSidebarSide(settings) === "right") {
    classes.workspace += " sidebar-right";
    classes.workspacePanels += " sidebar-right";
  }
  if (settings.panelDefaultLocation === "right") classes.workspaceBody += " panel-right";
  else if (settings.panelDefaultLocation === "left") classes.workspaceBody += " panel-left";
  if (settings.iconTheme === "minimal") classes.ide += " icon-minimal";
  else if (settings.iconTheme === "colored") classes.ide += " icon-colored";
  if (settings.offlineMode) classes.ide += " offline-mode";
  if (settings.enableSourceMaps) classes.ide += " source-maps-enabled";
  if (settings.showRustLogs) classes.ide += " rust-logs-enabled";
  if (settings.devTools) classes.ide += " devtools-enabled";

  return classes;
}

/** Piecewise lerp across [percent, alpha] keyframes (percent ascending). */
function lerpGlassKeyframes(pct: number, keyframes: readonly [number, number][]): number {
  const p = clamp(pct, keyframes[0][0], keyframes[keyframes.length - 1][0]);
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [p0, v0] = keyframes[i];
    const [p1, v1] = keyframes[i + 1];
    if (p >= p0 && p <= p1) {
      const t = (p - p0) / (p1 - p0);
      return v0 + t * (v1 - v0);
    }
  }
  return keyframes[keyframes.length - 1][1];
}

/** CSS frosted-glass tokens from the transparency slider — used by glass surfaces and debug HUD. */
export type GlassSurfaceMix = {
  strength: number;
  blurPx: number;
  editorAlpha: number;
  panelAlpha: number;
  chromeAlpha: number;
  borderAlpha: number;
};

/** Maps slider 50 (strongest glass) … 100 (solid) to backdrop-filter blur + tint alphas. */
export function glassSurfaceMix(percent: number): GlassSurfaceMix {
  const pct = clamp(percent, 50, 100);
  const strength = (100 - pct) / 50;

  const blurPx = Math.round(
    lerpGlassKeyframes(pct, [
      [50, 78],
      [65, 62],
      [80, 42],
      [95, 20],
      [100, 0],
    ]),
  );

  const editorAlpha = lerpGlassKeyframes(pct, [
    [50, 0.06],
    [65, 0.12],
    [80, 0.28],
    [95, 0.70],
    [100, 0.95],
  ]);

  const panelAlpha = lerpGlassKeyframes(pct, [
    [50, 0.12],
    [65, 0.22],
    [80, 0.44],
    [95, 0.78],
    [100, 0.97],
  ]);

  const chromeAlpha = lerpGlassKeyframes(pct, [
    [50, 0.16],
    [65, 0.30],
    [80, 0.50],
    [95, 0.82],
    [100, 0.96],
  ]);

  const borderAlpha = lerpGlassKeyframes(pct, [
    [50, 0.30],
    [65, 0.34],
    [80, 0.40],
    [95, 0.48],
    [100, 0.55],
  ]);

  return {
    strength,
    blurPx,
    editorAlpha,
    panelAlpha,
    chromeAlpha,
    borderAlpha,
  };
}

/** Glass-only CSS variables — core theme vars (--bg, --text, etc.) stay opaque/readable. */
export function buildGlassThemeVars(_settings: AppSettings): string {
  // GROKDEN-FIX: Glass / liquid theme disabled.
  return "";

  /* const theme = THEMES[settings.theme] ?? THEMES["codex"];
  const profile = theme.glass;
  const isLight = theme.isLight ?? profile.isLight;
  const { strength, blurPx, chromeAlpha, panelAlpha, editorAlpha, borderAlpha } = glassSurfaceMix(
    settings.windowTransparency,
  );

  const blurScale = profile.blurMultiplier;
  const blurChrome = Math.round(blurPx * 1.2 * blurScale);
  const blurPanel = Math.round(blurPx * blurScale);
  const blurEditor = Math.round(blurPx * 0.9 * blurScale);
  const glowAlpha = 0.03 + strength * 0.055;
  const specularAlpha = (0.05 + strength * 0.16) * profile.specularStrength;
  const sheenAlpha = (0.035 + strength * 0.06) * profile.sheenStrength;
  const contrastEdgeAlpha = (0.14 + strength * 0.1) * profile.contrastEdgeStrength;

  const tintBase = isLight ? theme.panelSolid : theme.chrome;
  const lineLight = isLight ? "#0f172a" : "#ffffff";
  const lineDark = isLight ? "#ffffff" : "#000000";

  const reduce = settings.reduceGlassEffects;
  const refractionMix = clamp(settings.glassRefraction, 0, 100) / 50;
  const edgeMix = clamp(settings.glassEdgeIntensity, 0, 100) / 50;
  const aberMix = clamp(settings.glassChromaticAberration, 0, 100) / 50;

  const refraction = strength * profile.refraction * (isLight ? 0.55 : 1) * refractionMix;
  const displacementScale = reduce ? 0 : Math.round(refraction * 22 * 10) / 10;
  const edgeWidth = (0.35 + strength * 0.45 * edgeMix) * (isLight ? 0.85 : 1);
  const aberration = reduce ? 0 : strength * profile.aberrationBias * (isLight ? 0.35 : 1) * aberMix;

  return [
    `--glass-strength:${strength.toFixed(3)}`,
    `--glass-blur:${blurPanel}px`,
    `--glass-blur-chrome:${blurChrome}px`,
    `--glass-blur-panel:${blurPanel}px`,
    `--glass-blur-editor:${blurEditor}px`,
    `--glass-chrome-bg:${hexToRgba(tintBase, chromeAlpha)}`,
    `--glass-panel-bg:${hexToRgba(theme.panelSolid, panelAlpha)}`,
    `--glass-editor-bg:${hexToRgba(theme.editorBg, editorAlpha)}`,
    `--glass-rail-bg:${hexToRgba(theme.panel, panelAlpha)}`,
    `--glass-border:${hexToRgba(lineLight, borderAlpha * (isLight ? 0.42 : 0.32))}`,
    `--glass-highlight:${hexToRgba(lineLight, specularAlpha)}`,
    `--glass-sheen:${hexToRgba(lineLight, sheenAlpha)}`,
    `--glass-contrast-edge:${hexToRgba(lineDark, contrastEdgeAlpha)}`,
    `--glass-panel-ring:${hexToRgba(lineLight, 0.05 + strength * 0.08)}`,
    `--glass-shadow:0 18px 70px rgba(0,0,0,${(0.34 + strength * 0.12).toFixed(3)}), inset 0 1px 0 ${hexToRgba(lineLight, specularAlpha)}`,
    `--glass-specular:${specularAlpha.toFixed(3)}`,
    `--glass-glow:${glowAlpha.toFixed(3)}`,
    `--glass-refraction:${refraction.toFixed(3)}`,
    `--glass-displacement-scale:${displacementScale.toFixed(1)}`,
    `--glass-edge-width:${edgeWidth.toFixed(3)}`,
    `--glass-aberration:${aberration.toFixed(3)}`,
  ].join(";"); */
}

export function buildExtraThemeVars(settings: AppSettings): string {
  const vars: string[] = [];
  const glass = buildGlassThemeVars(settings);
  if (glass) vars.push(glass);
  if (settings.experimentalFeatures) {
    vars.push("--experimental:1");
  }
  return vars.join(";");
}

export type RuntimeFlags = {
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  verboseLogging: boolean;
  offlineMode: boolean;
  gitEnabled: boolean;
  gitSignCommits: boolean;
  gitPullRebase: boolean;
  liveShareEnabled: boolean;
  presenceIndicators: boolean;
  showCollaboratorCursors: boolean;
  shareOnOpen: boolean;
  debugOpenOnBreak: boolean;
  debugConfirmOnExit: boolean;
  debugInlineValues: boolean;
  aiModel: string;
};

const BREAKPOINT_LABELS: Record<AppSettings["breakpointBehavior"], string> = {
  always: "Always pause",
  never: "Never pause",
  onException: "On exception",
};

export function gitPullStrategyLabel(settings: AppSettings): string {
  return settings.gitPullRebase ? "Pull — rebase" : "Pull — merge";
}

export function shouldSignCommits(settings: AppSettings): boolean {
  return settings.gitEnabled && settings.gitSignCommits;
}

export function shouldPauseOnBreakpoint(
  settings: AppSettings,
  onException = false,
): boolean {
  if (settings.breakpointBehavior === "never") return false;
  if (settings.breakpointBehavior === "onException") return onException;
  return true;
}

export function shouldStepInto(path: string, settings: AppSettings): boolean {
  const filters = parsePatterns(settings.stepIntoFilters);
  if (filters.length === 0) return true;
  return !pathMatchesAny(path, filters);
}

export function breakpointBehaviorLabel(settings: AppSettings): string {
  return BREAKPOINT_LABELS[settings.breakpointBehavior] ?? settings.breakpointBehavior;
}

export function buildDebugConsoleClasses(settings: AppSettings): string {
  return settings.debugConsoleWordWrap ? "debug-wrap" : "";
}

export function shouldShowPresenceIndicators(settings: AppSettings): boolean {
  return settings.liveShareEnabled && settings.presenceIndicators;
}

export function shouldShowCollaboratorCursors(settings: AppSettings): boolean {
  return settings.liveShareEnabled && settings.showCollaboratorCursors;
}

export function shouldAutoShareOnOpen(settings: AppSettings): boolean {
  return settings.liveShareEnabled && settings.shareOnOpen;
}

export type StatusChip = {
  label: string;
  tone?: "accent" | "warn" | "muted";
};

const SCOPED_SETTING_KEYS = [
  "startupBehavior",
  "autoSave",
  "showTerminalOnStart",
  "autoCheckUpdates",
  "allowPrereleaseUpdates",
  "telemetryEnabled",
  "crashReportsEnabled",
  "defaultOpenFolder",
  "uiLanguage",
  "confirmBeforeQuit",
  "confirmClose",
  "theme",
  "accent",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "uiDensity",
  "enableAnimations",
  "windowTransparency",
  "glassRefraction",
  "glassEdgeIntensity",
  "glassChromaticAberration",
  "reduceGlassEffects",
  "iconTheme",
  "showBreadcrumbs",
  "smoothScrolling",
  "restoreWindows",
  "zenMode",
  "centeredLayout",
  "titleBarStyle",
  "openFoldersInNewWindow",
  "windowRestoreFullscreen",
  "sidebarLocation",
  "sidebarPosition",
] as const satisfies readonly (keyof AppSettings)[];

let lastScopedSettingsJson = "";

function pickScopedSettings(settings: AppSettings): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of SCOPED_SETTING_KEYS) {
    picked[key] = settings[key];
  }
  return picked;
}

/** Hide decorative settings chips when the status bar is too narrow for a single row. */
export const STATUS_BAR_COMPACT_WIDTH = 1100;

export function buildStatusChips(
  settings: AppSettings,
  options?: { compact?: boolean },
): StatusChip[] {
  const compact = options?.compact ?? false;
  const chips: StatusChip[] = [];

  if (settings.autoSave) chips.push({ label: "Auto-save", tone: "accent" });
  if (settings.telemetryEnabled) chips.push({ label: "Telemetry", tone: "warn" });
  if (settings.zenMode) chips.push({ label: "Zen", tone: "accent" });

  if (compact) return chips;

  if (settings.confirmClose) chips.push({ label: "Confirm close", tone: "muted" });
  if (settings.confirmBeforeQuit) chips.push({ label: "Confirm quit", tone: "muted" });
  chips.push({
    label: UI_LANGUAGE_LABELS[settings.uiLanguage] ?? settings.uiLanguage,
    tone: "muted",
  });
  const defaultFolder = (settings.defaultOpenFolder ?? "").trim();
  if (defaultFolder) {
    const folder = defaultFolder;
    const short = folder.length > 24 ? `…${folder.slice(-22)}` : folder;
    chips.push({ label: `Default: ${short}`, tone: "muted" });
  }
  chips.push({ label: settings.theme, tone: "muted" });
  chips.push({ label: settings.accent, tone: "muted" });
  chips.push({ label: `${settings.fontSize}px`, tone: "muted" });
  chips.push({ label: settings.fontFamily, tone: "muted" });
  if (!settings.showTerminalOnStart) chips.push({ label: "Terminal hidden on start", tone: "muted" });
  if (!settings.crashReportsEnabled) chips.push({ label: "Crash reports off", tone: "muted" });
  if (settings.autoCheckUpdates) {
    chips.push({
      label: settings.allowPrereleaseUpdates ? "Updates (prerelease)" : "Updates on",
    });
  } else {
    chips.push({ label: "Updates off", tone: "muted" });
  }
  if (settings.openFoldersInNewWindow) chips.push({ label: "New window mode", tone: "muted" });
  if (settings.windowRestoreFullscreen) chips.push({ label: "Fullscreen restore" });
  if (settings.centeredLayout) chips.push({ label: "Centered" });
  if (!settings.restoreWindows) chips.push({ label: "No session restore", tone: "muted" });
  if (settings.titleBarStyle !== "custom") {
    chips.push({ label: `Title: ${settings.titleBarStyle}`, tone: "muted" });
  }
  if (effectiveSidebarSide(settings) === "right") chips.push({ label: "Sidebar right", tone: "muted" });
  if (settings.iconTheme !== "default") chips.push({ label: `Icons: ${settings.iconTheme}`, tone: "muted" });
  if (settings.uiDensity !== "comfortable") chips.push({ label: settings.uiDensity, tone: "muted" });
  if (settings.startupBehavior !== "restore") {
    chips.push({ label: `Start: ${settings.startupBehavior}`, tone: "muted" });
  }

  if (!settings.enableAnimations) chips.push({ label: "No motion", tone: "muted" });
  if (!settings.showBreadcrumbs) chips.push({ label: "No breadcrumbs", tone: "muted" });
  if (!settings.smoothScrolling) chips.push({ label: "Instant scroll", tone: "muted" });

  return chips;
}

export function shouldRestoreSession(settings: AppSettings): boolean {
  return settings.startupBehavior === "restore" && settings.restoreWindows;
}

export function syncRuntimeFlags(settings: AppSettings): RuntimeFlags {
  const flags: RuntimeFlags = {
    telemetryEnabled: settings.telemetryEnabled,
    crashReportsEnabled: settings.crashReportsEnabled,
    verboseLogging: settings.verboseLogging,
    offlineMode: settings.offlineMode,
    gitEnabled: settings.gitEnabled,
    gitSignCommits: settings.gitSignCommits,
    gitPullRebase: settings.gitPullRebase,
    liveShareEnabled: settings.liveShareEnabled,
    presenceIndicators: settings.presenceIndicators,
    showCollaboratorCursors: settings.showCollaboratorCursors,
    shareOnOpen: settings.shareOnOpen,
    debugOpenOnBreak: settings.debugOpenOnBreak,
    debugConfirmOnExit: settings.debugConfirmOnExit,
    debugInlineValues: settings.debugInlineValues,
    aiModel: settings.grokModel,
  };

  const ai = buildAiRuntimeConfig(settings);
  const network = buildNetworkRuntimeConfig(settings);
  const developer = buildDeveloperRuntimeConfig(settings);

  if (typeof window !== "undefined") {
    (window as unknown as { __grokdenFlags?: RuntimeFlags & {
      autoCheckUpdates: boolean;
      allowPrereleaseUpdates: boolean;
      ai: AiRuntimeConfig;
      network: NetworkRuntimeConfig;
      developer: DeveloperRuntimeConfig;
    } }).__grokdenFlags = {
      ...flags,
      autoCheckUpdates: settings.autoCheckUpdates,
      allowPrereleaseUpdates: settings.allowPrereleaseUpdates,
      ai,
      network,
      developer,
    };
    document.documentElement.lang = settings.uiLanguage || "en";
    document.documentElement.dataset.uiLang = settings.uiLanguage || "en";
    document.documentElement.dataset.reduceGlass = settings.reduceGlassEffects ? "1" : "0";
    applyDeveloperRuntime(settings);

    const scopedJson = JSON.stringify(pickScopedSettings(settings));
    if (settings.verboseLogging && scopedJson !== lastScopedSettingsJson) {
      if (!lastScopedSettingsJson) {
        console.info("[Grokden] Verbose logging enabled — scoped settings:", pickScopedSettings(settings));
      } else {
        const prev = JSON.parse(lastScopedSettingsJson) as Record<string, unknown>;
        const next = pickScopedSettings(settings);
        for (const key of SCOPED_SETTING_KEYS) {
          if (prev[key] !== next[key]) {
            console.info(`[Grokden] ${key}:`, prev[key], "→", next[key]);
          }
        }
      }
      lastScopedSettingsJson = scopedJson;
    } else if (!settings.verboseLogging) {
      lastScopedSettingsJson = "";
    }

    if (settings.autoCheckUpdates && settings.verboseLogging) {
      console.info(
        `[Grokden] Update check scheduled (prerelease: ${settings.allowPrereleaseUpdates})`,
      );
    }
  }

  return flags;
}

export function shouldShowBreadcrumbs(settings: AppSettings): boolean {
  return settings.showBreadcrumbs && !settings.zenMode;
}

export function shouldShowGitPanel(settings: AppSettings): boolean {
  return settings.gitEnabled;
}

export function panelMaximizedHeight(settings: AppSettings): number {
  return settings.panelMaximizeOnOpen ? 480 : clamp(settings.panelDefaultSize, 120, 600);
}

export function panelResizeCursor(location: PanelLocation): "ns-resize" | "ew-resize" {
  return location === "bottom" ? "ns-resize" : "ew-resize";
}

export type SearchOptionFlags = {
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWord: boolean;
  includeIgnored: boolean;
  followSymlinks: boolean;
};

export function getSearchOptionFlags(settings: AppSettings): SearchOptionFlags {
  return {
    caseSensitive: settings.searchCaseSensitive,
    useRegex: settings.searchUseRegex,
    wholeWord: settings.searchWholeWord,
    includeIgnored: settings.searchIncludeIgnored,
    followSymlinks: settings.searchFollowSymlinks,
  };
}

export function shouldExpandSymlinkDirectory(
  isSymlink: boolean | undefined,
  settings: AppSettings,
): boolean {
  if (!isSymlink) return true;
  return settings.searchFollowSymlinks;
}

export type ExplorerDisplayRow<T extends { path: string; name: string; isDir: boolean }> = {
  node: T;
  depthOffset: number;
  isNestChild: boolean;
  hasNestedChildren: boolean;
};

function parentDirectoryPath(filePath: string): string {
  const normalized = filePath.replace(/[/\\]+$/, "");
  const index = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (index <= 0) return normalized;
  return normalized.slice(0, index);
}

function findNestParentName(fileName: string, siblingNames: Set<string>): string | null {
  const segments = fileName.split(".");
  if (segments.length < 2) return null;
  const ext = segments[segments.length - 1];
  for (let i = segments.length - 1; i >= 1; i--) {
    const candidate = `${segments.slice(0, i).join(".")}.${ext}`;
    if (candidate !== fileName && siblingNames.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function buildExplorerDisplayRows<
  T extends { path: string; name: string; isDir: boolean },
>(
  nodes: T[],
  settings: AppSettings,
  expandedNestParents: ReadonlySet<string>,
): ExplorerDisplayRow<T>[] {
  if (!settings.fileNestingEnabled) {
    return nodes.map((node) => ({
      node,
      depthOffset: 0,
      isNestChild: false,
      hasNestedChildren: false,
    }));
  }

  const filesByParent = new Map<string, T[]>();
  for (const node of nodes) {
    if (node.isDir) continue;
    const parent = parentDirectoryPath(node.path);
    const bucket = filesByParent.get(parent) ?? [];
    bucket.push(node);
    filesByParent.set(parent, bucket);
  }

  const nestParentByChild = new Map<string, string>();
  const nestedChildrenByParent = new Map<string, T[]>();

  for (const [parent, files] of filesByParent) {
    const names = new Set(files.map((file) => file.name));
    for (const file of files) {
      const nestParent = findNestParentName(file.name, names);
      if (!nestParent) continue;
      const parentFile = files.find((entry) => entry.name === nestParent);
      if (!parentFile) continue;
      nestParentByChild.set(file.path, parentFile.path);
      const children = nestedChildrenByParent.get(parentFile.path) ?? [];
      children.push(file);
      nestedChildrenByParent.set(parentFile.path, children);
    }
  }

  const rows: ExplorerDisplayRow<T>[] = [];
  for (const node of nodes) {
    const nestParentPath = nestParentByChild.get(node.path);
    if (nestParentPath) {
      if (!expandedNestParents.has(nestParentPath)) continue;
      rows.push({
        node,
        depthOffset: 1,
        isNestChild: true,
        hasNestedChildren: false,
      });
      continue;
    }

    rows.push({
      node,
      depthOffset: 0,
      isNestChild: false,
      hasNestedChildren: (nestedChildrenByParent.get(node.path)?.length ?? 0) > 0,
    });
  }

  return rows;
}

export function initialSecondarySidebarOpen(settings: AppSettings): boolean {
  return settings.secondarySidebarDefault === "visible";
}

export function shouldAutoHideTerminal(settings: AppSettings): boolean {
  return settings.autoHidePanels;
}

export function shouldKeepTerminalSessionAlive(settings: AppSettings): boolean {
  return settings.terminalPersistSession;
}

export function panelInlineStyle(settings: AppSettings, size: number): string {
  if (settings.panelDefaultLocation === "bottom") {
    return `height: ${size}px`;
  }
  return `width: ${size}px`;
}

export type TerminalSessionSlice = {
  open: boolean;
  cwd: string | null;
  shell: string;
};

export function buildTerminalSessionSlice(
  settings: AppSettings,
  open: boolean,
  cwd: string | null,
): TerminalSessionSlice | null {
  if (!settings.terminalPersistSession) return null;
  return {
    open,
    cwd,
    shell: (settings.terminalShellPath ?? "").trim(),
  };
}

export function resolveRestoredTerminalOpen(
  settings: AppSettings,
  savedOpen: boolean | undefined,
): boolean {
  if (settings.terminalPersistSession && savedOpen !== undefined) {
    return savedOpen;
  }
  return settings.showTerminalOnStart;
}

export type SessionSnapshot = {
  folderPath: string | null;
  tabs: Array<{ path: string; name: string; savedContent: string }>;
  activeTabPath: string | null;
  terminalOpen: boolean;
  terminal: TerminalSessionSlice | null;
  secondarySidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activePanel: "explorer" | "search" | "scm";
};

export type ParsedSessionPayload = Partial<{
  folderPath: string | null;
  tabs: Array<{ path: string; name: string; savedContent: string }>;
  activeTabPath: string | null;
  terminalOpen: boolean;
  terminal: { open?: boolean; cwd?: string | null; shell?: string };
  secondarySidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activePanel: "explorer" | "search" | "scm";
}>;

/** True when there is no workspace folder and no editor tabs to restore. */
export function isEmptySessionSnapshot(
  snapshot: Pick<SessionSnapshot, "folderPath" | "tabs">,
): boolean {
  return !snapshot.folderPath && snapshot.tabs.length === 0;
}

/**
 * Gate session writes so startup hydration cannot clobber a saved session, and
 * welcome/empty startups do not erase a stored snapshot before the user works.
 */
export function shouldPersistSessionSnapshot(
  settings: AppSettings,
  hydrated: boolean,
  snapshot: Pick<SessionSnapshot, "folderPath" | "tabs">,
): boolean {
  if (!hydrated || !settings.restoreWindows) return false;
  if (!shouldRestoreSession(settings) && isEmptySessionSnapshot(snapshot)) return false;
  return true;
}

export function parseSessionPayload(raw: string): ParsedSessionPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const payload = parsed as ParsedSessionPayload;
    if (payload.tabs !== undefined && !Array.isArray(payload.tabs)) {
      delete payload.tabs;
    }
    if (Array.isArray(payload.tabs)) {
      payload.tabs = payload.tabs.filter(
        (t): t is NonNullable<typeof t> =>
          !!t &&
          typeof t === "object" &&
          typeof (t as { path?: unknown }).path === "string" &&
          typeof (t as { name?: unknown }).name === "string",
      );
    }
    return payload;
  } catch {
    return null;
  }
}

export function resolveSavedTerminalOpen(payload: ParsedSessionPayload): boolean | undefined {
  if (payload.terminal?.open !== undefined) return payload.terminal.open;
  return payload.terminalOpen;
}

export function applyRestoredTerminalSettings(
  settings: AppSettings,
  payload: ParsedSessionPayload,
): AppSettings {
  if (!settings.terminalPersistSession || payload.terminal?.shell === undefined) {
    return settings;
  }
  return { ...settings, terminalShellPath: payload.terminal.shell };
}

export type OutlineSymbol = {
  name: string;
  line: number;
  kind: "function" | "class" | "interface" | "type" | "const" | "export";
};

export function extractOutlineSymbols(content: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = [];
  const lines = content.split("\n");
  const patterns: Array<{ kind: OutlineSymbol["kind"]; re: RegExp }> = [
    { kind: "class", re: /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/ },
    { kind: "interface", re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/ },
    { kind: "type", re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/ },
    { kind: "function", re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
    {
      kind: "function",
      re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/,
    },
    { kind: "const", re: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)/ },
    { kind: "export", re: /^\s*export\s+(?:default\s+)?(?:class|function|const)\s+([A-Za-z_$][\w$]*)/ },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { kind, re } of patterns) {
      const match = line.match(re);
      if (match?.[1]) {
        symbols.push({ name: match[1], line: i + 1, kind });
        break;
      }
    }
    if (symbols.length >= 200) break;
  }

  return symbols;
}

export function buildIdeLayoutClassesWithSecondary(
  settings: AppSettings,
  secondarySidebarOpen: boolean,
): IdeLayoutClasses {
  const classes = buildIdeLayoutClasses(settings);
  if (secondarySidebarOpen) classes.workspacePanels += " secondary-open";
  return classes;
}

// ── Editor typography & layout ─────────────────────────────────────────────

export function buildEditorClasses(settings: AppSettings): string {
  const parts: string[] = [];

  if (settings.bracketPairColorization) parts.push("bracket-colorize");
  if (settings.scrollBeyondLastLine) parts.push("scroll-beyond");
  if (settings.stickyScroll) parts.push("sticky-scroll");
  if (settings.renderWhitespace === "all") parts.push("show-whitespace-all");
  else if (settings.renderWhitespace === "boundary") parts.push("show-whitespace-boundary");
  if (settings.cursorBlinking === "smooth") parts.push("cursor-smooth");
  else if (settings.cursorBlinking === "phase") parts.push("cursor-phase");
  else if (settings.cursorBlinking === "solid") parts.push("cursor-solid");
  if (settings.cursorStyle === "block") parts.push("cursor-block");
  else if (settings.cursorStyle === "underline") parts.push("cursor-underline");
  else if (settings.cursorStyle === "line") parts.push("cursor-line");
  if (settings.vimMode) parts.push("vim-mode");
  if (settings.smoothScrolling) parts.push("smooth-scroll");
  if (!settings.insertSpaces) parts.push("use-tab-chars");
  if (!settings.autoClosingBrackets) parts.push("no-auto-close");
  if (settings.aiInlineSuggestions) parts.push("ai-inline-suggestions");
  return parts.join(" ");
}

// ── Whitespace & sticky scroll ───────────────────────────────────────────────

export function renderWhitespaceVisual(content: string, mode: string): string {
  if (mode === "none") return "";
  const showAll = mode === "all";
  const markChar = (ch: string) => (ch === "\t" ? "→" : "·");

  return content
    .split("\n")
    .map((line) => {
      if (showAll) {
        return line
          .split("")
          .map((ch) => (ch === " " || ch === "\t" ? markChar(ch) : " "))
          .join("");
      }
      const trail = line.match(/[ \t]+$/);
      if (!trail) return " ".repeat(line.length);
      const visibleLen = line.length - trail[0].length;
      const marked = trail[0]
        .split("")
        .map((ch) => markChar(ch))
        .join("");
      return " ".repeat(visibleLen) + marked;
    })
    .join("\n");
}

export function lineHasTrailingWhitespace(line: string): boolean {
  return /[ \t]+$/.test(line);
}

const SCOPE_PATTERNS = [
  /^\s*(export\s+)?(async\s+)?function\s+\w+/,
  /^\s*(export\s+)?class\s+\w+/,
  /^\s*(export\s+)?(interface|type|enum)\s+\w+/,
  /^\s*(pub\s+)?(async\s+)?fn\s+\w+/,
  /^\s*(pub\s+)?struct\s+\w+/,
  /^\s*(pub\s+)?impl\b/,
  /^\s*if\s*\(/,
  /^\s*for\s*\(/,
  /^\s*while\s*\(/,
  /^\s*switch\s*\(/,
  /^\s*#\[/,
];

export function stickyScrollHeaders(content: string, cursorLine: number): string[] {
  const lines = content.split("\n");
  const headers: string[] = [];
  for (let i = 0; i < Math.min(cursorLine, lines.length); i++) {
    const line = lines[i];
    if (SCOPE_PATTERNS.some((re) => re.test(line))) {
      headers.push(line.trim().slice(0, 80));
    }
  }
  return headers.slice(-3);
}

// ── Bracket helpers ──────────────────────────────────────────────────────────

export const BRACKET_PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

export function handleAutoClose(
  value: string,
  cursor: number,
  char: string,
  enabled: boolean,
): { value: string; cursor: number } | null {
  if (!enabled) return null;
  const close = BRACKET_PAIRS[char];
  if (!close) return null;
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  if (char === '"' || char === "'" || char === "`") {
    if (after.startsWith(close)) {
      return { value: before + char + after.slice(1), cursor: cursor + 1 };
    }
  }
  return { value: before + char + close + after, cursor: cursor + 1 };
}

export function insertTabAtSelection(
  value: string,
  start: number,
  end: number,
  settings: AppSettings,
): { value: string; start: number; end: number } {
  const indent = settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t";
  if (start !== end) {
    const lines = value.slice(0, start).split("\n");
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selected = value.slice(lineStart, end);
    const indented = selected
      .split("\n")
      .map((l) => indent + l)
      .join("\n");
    const newValue = value.slice(0, lineStart) + indented + value.slice(end);
    return { value: newValue, start: start + indent.length, end: end + (indented.length - selected.length) };
  }
  const newValue = value.slice(0, start) + indent + value.slice(end);
  return { value: newValue, start: start + indent.length, end: start + indent.length };
}

// ── Format & lint ────────────────────────────────────────────────────────────

export type FormatResult = { content: string; changed: boolean; label: string };

function formatJson(content: string): FormatResult {
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2) + "\n";
    return { content: formatted, changed: formatted !== content, label: "JSON" };
  } catch {
    return { content, changed: false, label: "JSON" };
  }
}

function normalizeTrailing(content: string): string {
  const lines = content.split("\n");
  const trimmed = lines.map((l) => l.replace(/[ \t]+$/, ""));
  let result = trimmed.join("\n");
  if (result.length > 0 && !result.endsWith("\n")) result += "\n";
  return result;
}

function builtinFormat(content: string, fileName: string): FormatResult {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return formatJson(content);
  const normalized = normalizeTrailing(content);
  return { content: normalized, changed: normalized !== content, label: "Built-in" };
}

export function formatContent(
  content: string,
  fileName: string,
  settings: AppSettings,
): FormatResult {
  const formatter = settings.defaultFormatter;
  if (formatter === "builtin") {
    return builtinFormat(content, fileName);
  }
  if (formatter === "prettier") {
    const result = builtinFormat(content, fileName);
    return { ...result, label: "Prettier (built-in shim)" };
  }
  if (formatter === "rustfmt") {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "rs") {
      const normalized = normalizeTrailing(content);
      return { content: normalized, changed: normalized !== content, label: "rustfmt (built-in shim)" };
    }
    return builtinFormat(content, fileName);
  }
  return builtinFormat(content, fileName);
}

export type LintIssue = { line: number; message: string; severity: "warn" | "error" };

export type WorkspaceLintIssue = LintIssue & { path: string; name: string };

export function lintContent(
  content: string,
  fileName: string,
  settings: AppSettings,
): LintIssue[] {
  if (settings.defaultLinter === "none") return [];
  const issues: LintIssue[] = [];
  const lines = content.split("\n");
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  lines.forEach((line, i) => {
    if (/[ \t]+$/.test(line)) {
      issues.push({ line: i + 1, message: "Trailing whitespace", severity: "warn" });
    }
    if (line.includes("\t") && settings.insertSpaces) {
      issues.push({ line: i + 1, message: "Tab character in space-indent file", severity: "warn" });
    }
  });

  if (settings.defaultLinter === "eslint" && ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext)) {
    if (content.includes("console.log")) {
      const idx = lines.findIndex((l) => l.includes("console.log"));
      if (idx >= 0) {
        issues.push({ line: idx + 1, message: "Unexpected console statement", severity: "warn" });
      }
    }
  }

  if (settings.defaultLinter === "clippy" && ext === "rs") {
    lines.forEach((line, i) => {
      if (/\.unwrap\(\)/.test(line)) {
        issues.push({ line: i + 1, message: "Consider avoiding unwrap()", severity: "warn" });
      }
    });
  }

  return issues.slice(0, 20);
}

export function lintWorkspaceTabs(
  tabs: Array<{ path: string; name: string; content: string }>,
  settings: AppSettings,
): WorkspaceLintIssue[] {
  const issues: WorkspaceLintIssue[] = [];
  for (const tab of tabs) {
    for (const issue of lintContent(tab.content, tab.name, settings)) {
      issues.push({ ...issue, path: tab.path, name: tab.name });
    }
  }
  return issues.slice(0, 50);
}

export function applyEslintAutoFix(
  content: string,
  fileName: string,
  settings: AppSettings,
): FormatResult {
  if (!settings.eslintAutoFixOnSave) {
    return { content, changed: false, label: "ESLint" };
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!["js", "jsx", "ts", "tsx", "mjs", "cjs", "svelte"].includes(ext)) {
    return { content, changed: false, label: "ESLint" };
  }
  const fixed = normalizeTrailing(content);
  return { content: fixed, changed: fixed !== content, label: "ESLint auto-fix" };
}

export function applySavePipeline(
  content: string,
  fileName: string,
  settings: AppSettings,
): FormatResult {
  let current = content;
  let changed = false;
  const labels: string[] = [];

  if (settings.formatOnSave) {
    const fmt = formatContent(current, fileName, settings);
    current = fmt.content;
    changed = changed || fmt.changed;
    if (fmt.changed) labels.push(fmt.label);
  }

  if (settings.eslintAutoFixOnSave) {
    const lint = applyEslintAutoFix(current, fileName, settings);
    current = lint.content;
    changed = changed || lint.changed;
    if (lint.changed) labels.push(lint.label);
  }

  return {
    content: current,
    changed,
    label: labels.length ? labels.join(" + ") : "unchanged",
  };
}

export function resolveToolPaths(settings: AppSettings): {
  typescript: string;
  rustAnalyzer: string;
} {
  return {
    typescript: (settings.typescriptSdkPath ?? "").trim() || "workspace",
    rustAnalyzer: (settings.rustAnalyzerPath ?? "").trim() || "PATH",
  };
}

// ── Keymap ───────────────────────────────────────────────────────────────────

export type KeybindingAction =
  | "save"
  | "saveAll"
  | "toggleSidebar"
  | "toggleTerminal"
  | "openSettings"
  | "toggleZen"
  | "closeTab"
  | "quickOpen"
  | "commandPalette";

type KeySpec = { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean };

const PRESET_BINDINGS: Record<string, Partial<Record<KeybindingAction, KeySpec>>> = {
  default: {
    save: { key: "s", ctrl: true },
    toggleSidebar: { key: "b", ctrl: true },
    toggleTerminal: { key: "`", ctrl: true },
    openSettings: { key: ",", ctrl: true },
    toggleZen: { key: "k", ctrl: true },
    quickOpen: { key: "p", ctrl: true },
    commandPalette: { key: "p", ctrl: true, shift: true },
  },
  vscode: {
    save: { key: "s", ctrl: true },
    saveAll: { key: "s", ctrl: true, shift: true },
    toggleSidebar: { key: "b", ctrl: true },
    toggleTerminal: { key: "`", ctrl: true },
    openSettings: { key: ",", ctrl: true },
    closeTab: { key: "w", ctrl: true },
    quickOpen: { key: "p", ctrl: true },
    commandPalette: { key: "p", ctrl: true, shift: true },
    toggleZen: { key: "k", ctrl: true },
  },
  sublime: {
    save: { key: "s", ctrl: true },
    toggleSidebar: { key: "k", ctrl: true, shift: true },
    toggleTerminal: { key: "`", ctrl: true },
    openSettings: { key: ",", ctrl: true },
    quickOpen: { key: "p", ctrl: true },
    commandPalette: { key: "p", ctrl: true, shift: true },
    closeTab: { key: "w", ctrl: true },
    toggleZen: { key: "k", ctrl: true },
  },
  vim: {
    save: { key: "s", ctrl: true },
    toggleSidebar: { key: "b", ctrl: true },
    toggleTerminal: { key: "`", ctrl: true },
    openSettings: { key: ",", ctrl: true },
    quickOpen: { key: "p", ctrl: true },
    commandPalette: { key: "p", ctrl: true, shift: true },
    toggleZen: { key: "k", ctrl: true },
  },
};

export function matchKeybinding(
  event: KeyboardEvent,
  action: KeybindingAction,
  settings: AppSettings,
): boolean {
  const preset = PRESET_BINDINGS[settings.keybindingPreset] ?? PRESET_BINDINGS.default;
  const spec = preset[action] ?? PRESET_BINDINGS.default[action];
  if (!spec) return false;
  const mod = event.ctrlKey || event.metaKey;
  if (!!spec.ctrl !== mod) return false;
  if (!!spec.shift !== event.shiftKey) return false;
  if (!!spec.alt !== event.altKey) return false;
  return event.key.toLowerCase() === spec.key.toLowerCase();
}

export type ChordState = { pending: boolean; timer: ReturnType<typeof setTimeout> | null };

export function createChordState(): ChordState {
  return { pending: false, timer: null };
}

export function resetChord(state: ChordState): void {
  if (state.timer) clearTimeout(state.timer);
  state.pending = false;
  state.timer = null;
}

export function startChord(state: ChordState, timeoutMs: number, onExpire: () => void): void {
  resetChord(state);
  state.pending = true;
  state.timer = setTimeout(() => {
    state.pending = false;
    state.timer = null;
    onExpire();
  }, timeoutMs);
}

export type ChordAction = "saveAll" | "openSettings" | "toggleZen" | null;

export function resolveChordSecondKey(key: string): ChordAction {
  const k = key.toLowerCase();
  if (k === "s") return "saveAll";
  if (k === ",") return "openSettings";
  if (k === "z") return "toggleZen";
  return null;
}

export function multiCursorModifierActive(
  event: MouseEvent | KeyboardEvent,
  modifier: string,
): boolean {
  if (modifier === "alt") return event.altKey;
  if (modifier === "ctrl") return event.ctrlKey;
  if (modifier === "cmd") return event.metaKey;
  return event.altKey;
}

/** Merge a prior cursor anchor into extra-cursor positions (deduped, excludes new primary). */
export function mergeMultiCursorAnchor(
  extraCursors: number[],
  anchor: number | null,
  newPrimary: number,
): number[] {
  if (anchor === null || anchor === newPrimary) return extraCursors;
  const merged = [...extraCursors, anchor].filter((p) => p !== newPrimary);
  return [...new Set(merged)];
}

// ── Vim cursor movement (textarea offsets) ───────────────────────────────────

export function vimCursorLeft(pos: number): number | null {
  return pos > 0 ? pos - 1 : null;
}

export function vimCursorRight(value: string, pos: number): number | null {
  return pos < value.length ? pos + 1 : null;
}

export function vimCursorUp(value: string, pos: number): number | null {
  const lines = value.slice(0, pos).split("\n");
  if (lines.length <= 1) return null;
  const col = lines[lines.length - 1].length;
  const prevLine = lines[lines.length - 2];
  const uptoPrev = lines.slice(0, -1).join("\n");
  return uptoPrev.length - prevLine.length + Math.min(col, prevLine.length);
}

export function vimCursorDown(value: string, pos: number): number | null {
  const lines = value.slice(0, pos).split("\n");
  const lineIdx = lines.length;
  const allLines = value.split("\n");
  if (lineIdx >= allLines.length) return null;
  const col = lines[lines.length - 1].length;
  const prefix = allLines.slice(0, lineIdx).join("\n");
  return prefix.length + (prefix ? 1 : 0) + Math.min(col, allLines[lineIdx].length);
}

export function keybindingPresetLabel(preset: string): string {
  const labels: Record<string, string> = {
    default: "Grokden",
    vscode: "VS Code",
    sublime: "Sublime",
    vim: "Vim",
  };
  return labels[preset] ?? preset;
}

export type EditorStatusInfo = {
  formatter: string;
  linter: string;
  keymap: string;
  vimMode: string | null;
  tools: string[];
  lintCount: number;
  multiCursor: number;
};

export function buildEditorStatusInfo(
  settings: AppSettings,
  fileName: string | null,
  lintCount: number,
  extraCursors: number,
  vimSubMode: string | null,
): EditorStatusInfo {
  const tools = resolveToolPaths(settings);
  const toolChips: string[] = [];
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (["ts", "tsx", "js", "jsx"].includes(ext) && tools.typescript !== "workspace") {
      toolChips.push(`TS: ${tools.typescript}`);
    }
    if (ext === "rs" && tools.rustAnalyzer !== "PATH") {
      toolChips.push(`RA: ${tools.rustAnalyzer}`);
    }
  }
  return {
    formatter: settings.defaultFormatter,
    linter: settings.defaultLinter,
    keymap: keybindingPresetLabel(settings.keybindingPreset),
    vimMode: settings.vimMode ? (vimSubMode ?? "NORMAL") : null,
    tools: toolChips,
    lintCount,
    multiCursor: 1 + extraCursors,
  };
}

// ── AI, network & developer runtime ─────────────────────────────────────────

export type AiRuntimeConfig = {
  grokModel: string;
  aiContextWindow: number;
  aiInlineSuggestions: boolean;
  aiAgentModeDefault: boolean;
  aiTemperature: number;
  aiMaxTokens: number;
  aiIncludeOpenFiles: boolean;
  aiAutoContext: boolean;
};

export type NetworkRuntimeConfig = {
  proxyUrl: string;
  offlineMode: boolean;
  requestTimeout: number;
  useSystemProxy: boolean;
  tlsVerify: boolean;
};

export type DeveloperRuntimeConfig = {
  devTools: boolean;
  verboseLogging: boolean;
  experimentalFeatures: boolean;
  reloadOnSave: boolean;
  showRustLogs: boolean;
  enableSourceMaps: boolean;
};

export type AiContextFile = {
  path: string;
  name: string;
  content: string;
};

export type AiStatusChip = {
  label: string;
  tone?: "accent" | "warn" | "muted";
  title?: string;
};

export type DevToolsOpener = () => Promise<unknown>;

let lastDevToolsRequested = false;

export function buildAiRuntimeConfig(settings: AppSettings): AiRuntimeConfig {
  return {
    grokModel: settings.grokModel,
    aiContextWindow: settings.aiContextWindow,
    aiInlineSuggestions: settings.aiInlineSuggestions,
    aiAgentModeDefault: settings.aiAgentModeDefault,
    aiTemperature: settings.aiTemperature,
    aiMaxTokens: settings.aiMaxTokens,
    aiIncludeOpenFiles: settings.aiIncludeOpenFiles,
    aiAutoContext: settings.aiAutoContext,
  };
}

export function buildNetworkRuntimeConfig(settings: AppSettings): NetworkRuntimeConfig {
  return {
    proxyUrl: (settings.proxyUrl ?? "").trim(),
    offlineMode: settings.offlineMode,
    requestTimeout: settings.requestTimeout,
    useSystemProxy: settings.useSystemProxy,
    tlsVerify: settings.tlsVerify,
  };
}

export function buildDeveloperRuntimeConfig(settings: AppSettings): DeveloperRuntimeConfig {
  return {
    devTools: settings.devTools,
    verboseLogging: settings.verboseLogging,
    experimentalFeatures: settings.experimentalFeatures,
    reloadOnSave: settings.reloadOnSave,
    showRustLogs: settings.showRustLogs,
    enableSourceMaps: settings.enableSourceMaps,
  };
}

/** Default Grok CLI agent profile when agent mode is enabled (`grok inspect` built-in). */
export const GROK_CLI_DEFAULT_AGENT = "general-purpose";

/** Terminal command injected when launching Grok CLI inside the integrated terminal. */
export function buildGrokLaunchCommand(settings: AppSettings): string {
  const parts = ["grok"];
  if (settings.grokModel) {
    parts.push("--model", settings.grokModel);
  }
  if (settings.aiAgentModeDefault) {
    parts.push("--agent", GROK_CLI_DEFAULT_AGENT);
  }
  return parts.join(" ");
}

export function buildAiContextFiles(
  settings: AppSettings,
  tabs: ReadonlyArray<{ path: string; name: string; content: string }>,
  activePath: string | null,
): AiContextFile[] {
  if (!settings.aiIncludeOpenFiles && !settings.aiAutoContext) return [];

  const byPath = new Map<string, AiContextFile>();
  if (settings.aiIncludeOpenFiles) {
    for (const tab of tabs) {
      byPath.set(tab.path, { path: tab.path, name: tab.name, content: tab.content });
    }
  }
  if (settings.aiAutoContext && activePath) {
    const active = tabs.find((tab) => tab.path === activePath);
    if (active) {
      byPath.set(active.path, { path: active.path, name: active.name, content: active.content });
    }
  }
  return Array.from(byPath.values());
}

export function buildAiStatusChips(settings: AppSettings): AiStatusChip[] {
  const chips: AiStatusChip[] = [
    {
      label: settings.grokModel,
      tone: "muted",
      title: `Temperature ${settings.aiTemperature.toFixed(1)} · max ${settings.aiMaxTokens} tokens`,
    },
  ];
  if (settings.aiAgentModeDefault) {
    chips.push({ label: "Agent", tone: "accent", title: "Agent mode default" });
  }
  if (settings.aiInlineSuggestions) {
    chips.push({ label: "Inline AI", tone: "accent", title: "Inline suggestions enabled" });
  }
  if (settings.aiAutoContext || settings.aiIncludeOpenFiles) {
    chips.push({
      label: "Ctx",
      tone: "muted",
      title: `Context ${settings.aiContextWindow.toLocaleString()} · open files: ${settings.aiIncludeOpenFiles ? "yes" : "no"} · auto: ${settings.aiAutoContext ? "yes" : "no"}`,
    });
  }
  return chips;
}

export function buildOutputPanelLines(settings: AppSettings): string[] {
  const lines = ["Build output will appear here."];
  if (settings.showRustLogs) {
    lines.push("", "[Rust] Backend logs enabled — Tauri/Rust output streams here when available.");
  }
  const network = buildNetworkRuntimeConfig(settings);
  if (network.proxyUrl) {
    lines.push(`[Network] Proxy: ${network.proxyUrl}`);
  }
  if (network.offlineMode) {
    lines.push("[Network] Offline mode — outbound requests are disabled.");
  }
  lines.push(
    `[Network] Timeout: ${network.requestTimeout}s · System proxy: ${network.useSystemProxy ? "on" : "off"} · TLS verify: ${network.tlsVerify ? "on" : "off"}`,
  );
  if (settings.enableSourceMaps) {
    lines.push("[Dev] Source maps enabled for stack traces.");
  }
  if (settings.reloadOnSave) {
    lines.push("[Dev] Reload on save — webview refreshes after each save.");
  }
  return lines;
}

export function shouldBlockNetworkRequests(settings: AppSettings): boolean {
  return settings.offlineMode;
}

export function shouldReloadAfterSave(settings: AppSettings): boolean {
  return settings.reloadOnSave;
}

export function applyDeveloperRuntime(
  settings: AppSettings,
  openDevTools?: DevToolsOpener,
): void {
  if (typeof document === "undefined") return;

  const dev = buildDeveloperRuntimeConfig(settings);
  const root = document.documentElement;

  root.dataset.offline = settings.offlineMode ? "1" : "0";
  root.dataset.sourceMaps = dev.enableSourceMaps ? "1" : "0";
  root.dataset.rustLogs = dev.showRustLogs ? "1" : "0";
  root.dataset.experimental = dev.experimentalFeatures ? "1" : "0";
  root.dataset.aiInline = settings.aiInlineSuggestions ? "1" : "0";
  root.dataset.devtools = dev.devTools ? "1" : "0";

  if (dev.devTools && !lastDevToolsRequested && openDevTools) {
    void openDevTools().catch(() => undefined);
  }
  lastDevToolsRequested = dev.devTools;
}

export function syncAiContext(
  settings: AppSettings,
  tabs: ReadonlyArray<{ path: string; name: string; content: string }>,
  activePath: string | null,
): AiContextFile[] {
  const files = buildAiContextFiles(settings, tabs, activePath);
  if (typeof window !== "undefined") {
    (
      window as unknown as {
        __grokdenAiContext?: {
          config: AiRuntimeConfig;
          files: AiContextFile[];
          network: NetworkRuntimeConfig;
          developer: DeveloperRuntimeConfig;
        };
      }
    ).__grokdenAiContext = {
      config: buildAiRuntimeConfig(settings),
      files,
      network: buildNetworkRuntimeConfig(settings),
      developer: buildDeveloperRuntimeConfig(settings),
    };
  }
  return files;
}
