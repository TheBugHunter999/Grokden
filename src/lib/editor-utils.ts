export type FileMeta = { label: string; color: string };

export type SearchMatch = { path: string; name: string; line: number; text: string };

export type TitleBarStyle = "native" | "custom" | "hidden";
export type PanelLocation = "bottom" | "right" | "left";
export type SidebarLocation = "left" | "right";
export type BreakpointBehavior = "always" | "never" | "onException";
export type TerminalCursorStyle = "block" | "underline" | "line";
export type AgentModePreset = "strict" | "review-driven" | "agent-driven" | "custom";
export type ExecutionPolicy = "ask-every-time" | "review-first" | "auto-run";
export type ImportSource = "fresh" | "vscode" | "cursor";
export type ExtensionSetupMode = "recommended" | "configure";

export type AppSettings = {
  theme: string;
  accent: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  tabSize: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  confirmClose: boolean;
  showTerminalOnStart: boolean;
  startupBehavior: string;
  autoCheckUpdates: boolean;
  allowPrereleaseUpdates: boolean;
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  defaultOpenFolder: string;
  uiLanguage: string;
  confirmBeforeQuit: boolean;
  uiDensity: string;
  enableAnimations: boolean;
  windowTransparency: number;
  sidebarPosition: string;
  iconTheme: string;
  showBreadcrumbs: boolean;
  smoothScrolling: boolean;
  keybindingPreset: string;
  chordTimeout: number;
  vimMode: boolean;
  multiCursorModifier: string;
  enableChordKeybindings: boolean;
  keyRepeatDelay: number;
  minimap: boolean;
  bracketPairColorization: boolean;
  formatOnSave: boolean;
  rulerColumn: number;
  scrollBeyondLastLine: boolean;
  renderWhitespace: string;
  stickyScroll: boolean;
  autoClosingBrackets: boolean;
  insertSpaces: boolean;
  cursorBlinking: string;
  cursorStyle: string;
  defaultFormatter: string;
  defaultLinter: string;
  typescriptSdkPath: string;
  rustAnalyzerPath: string;
  eslintAutoFixOnSave: boolean;
  formatOnPaste: boolean;
  gitEnabled: boolean;
  gitAutoFetch: boolean;
  gitDiffMode: string;
  gitBlame: boolean;
  gitDefaultBranch: string;
  gitSignCommits: boolean;
  gitPullRebase: boolean;
  liveShareEnabled: boolean;
  presenceIndicators: boolean;
  showCollaboratorCursors: boolean;
  shareOnOpen: boolean;
  grokModel: string;
  aiContextWindow: number;
  aiInlineSuggestions: boolean;
  aiAgentModeDefault: boolean;
  aiTemperature: number;
  aiMaxTokens: number;
  aiIncludeOpenFiles: boolean;
  aiAutoContext: boolean;
  proxyUrl: string;
  offlineMode: boolean;
  requestTimeout: number;
  useSystemProxy: boolean;
  tlsVerify: boolean;
  devTools: boolean;
  verboseLogging: boolean;
  experimentalFeatures: boolean;
  reloadOnSave: boolean;
  showRustLogs: boolean;
  enableSourceMaps: boolean;
  searchExcludePatterns: string;
  searchCaseSensitive: boolean;
  searchFollowSymlinks: boolean;
  fileNestingEnabled: boolean;
  searchUseRegex: boolean;
  searchWholeWord: boolean;
  filesExcludePatterns: string;
  searchIncludeIgnored: boolean;
  restoreWindows: boolean;
  zenMode: boolean;
  centeredLayout: boolean;
  titleBarStyle: TitleBarStyle;
  openFoldersInNewWindow: boolean;
  windowRestoreFullscreen: boolean;
  panelDefaultLocation: PanelLocation;
  panelDefaultSize: number;
  autoHidePanels: boolean;
  sidebarLocation: SidebarLocation;
  panelMaximizeOnOpen: boolean;
  secondarySidebarDefault: "visible" | "hidden";
  debugConsoleWordWrap: boolean;
  breakpointBehavior: BreakpointBehavior;
  stepIntoFilters: string;
  debugOpenOnBreak: boolean;
  debugConfirmOnExit: boolean;
  debugInlineValues: boolean;
  terminalShellPath: string;
  terminalFontSize: number;
  terminalScrollback: number;
  terminalCopyOnSelect: boolean;
  terminalCursorStyle: TerminalCursorStyle;
  terminalGpuAcceleration: boolean;
  terminalBell: boolean;
  terminalPersistSession: boolean;
  onboardingCompleted: boolean;
  agentModePreset: AgentModePreset;
  terminalExecutionPolicy: ExecutionPolicy;
  artifactReviewPolicy: ExecutionPolicy;
  jsExecutionPolicy: ExecutionPolicy;
  importSource: ImportSource;
  extensionSetupMode: ExtensionSetupMode;
  privacyImprovementConsent: boolean;
};

export const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".svelte", ".vue", ".html", ".htm", ".css", ".scss", ".less",
  ".json", ".md", ".txt", ".rs", ".toml", ".yaml", ".yml",
  ".xml", ".svg", ".py", ".go", ".java", ".c", ".cpp", ".h",
  ".sh", ".bat", ".ps1", ".sql", ".env", ".gitignore",
]);

export const FILE_META: Record<string, FileMeta> = {
  ts: { label: "TS", color: "#3aa0ff" },
  tsx: { label: "TS", color: "#3aa0ff" },
  js: { label: "JS", color: "#f0c33c" },
  jsx: { label: "JS", color: "#f0c33c" },
  mjs: { label: "JS", color: "#f0c33c" },
  cjs: { label: "JS", color: "#f0c33c" },
  svelte: { label: "SV", color: "#ff6a3d" },
  vue: { label: "VU", color: "#4fc08d" },
  rs: { label: "RS", color: "#e08a5b" },
  json: { label: "JN", color: "#f0c33c" },
  md: { label: "MD", color: "#8a9bb5" },
  html: { label: "HT", color: "#ff6a3d" },
  htm: { label: "HT", color: "#ff6a3d" },
  css: { label: "CS", color: "#56b6ff" },
  scss: { label: "CS", color: "#ff61b8" },
  less: { label: "CS", color: "#56b6ff" },
  toml: { label: "TO", color: "#9c8aff" },
  yaml: { label: "YM", color: "#c678dd" },
  yml: { label: "YM", color: "#c678dd" },
  py: { label: "PY", color: "#56b6ff" },
  go: { label: "GO", color: "#4fd1d9" },
  sh: { label: "SH", color: "#7fd17f" },
  sql: { label: "DB", color: "#f0a35c" },
  svg: { label: "SVG", color: "#f0c33c" },
};

export const LANGUAGE_NAMES: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
  mjs: "JavaScript", cjs: "JavaScript", svelte: "Svelte", vue: "Vue",
  rs: "Rust", json: "JSON", md: "Markdown", html: "HTML", htm: "HTML",
  css: "CSS", scss: "SCSS", less: "Less", toml: "TOML", yaml: "YAML",
  yml: "YAML", py: "Python", go: "Go", java: "Java", c: "C", cpp: "C++",
  h: "C Header", sh: "Shell", bat: "Batch", ps1: "PowerShell", sql: "SQL",
  txt: "Plain Text", svg: "SVG", xml: "XML",
};

export type ThemePalette = {
  bg: string;
  panel: string;
  panelSolid: string;
  editorBg: string;
  border: string;
  text: string;
  textDim: string;
  textMute: string;
  hover: string;
  danger: string;
  warn: string;
  success: string;
  onAccent: string;
  chipBg: string;
  isLight?: boolean;
};

export const THEMES: Record<string, ThemePalette> = {
  "grokden-dark": {
    bg: "#09090d", panel: "#111116", panelSolid: "#13131a", editorBg: "#0c0c11",
    border: "rgba(255,255,255,0.08)", text: "#e4e4ec", textDim: "#b4b4c4", textMute: "#7a7a8c",
    hover: "rgba(255,255,255,0.05)", danger: "#e06c75", warn: "#e5c07b", success: "#98c379",
    onAccent: "#ffffff", chipBg: "rgba(255,255,255,0.06)",
  },
  charcoal: {
    bg: "#121214", panel: "#1a1a1e", panelSolid: "#1e1e22", editorBg: "#141416",
    border: "rgba(255,255,255,0.07)", text: "#e8e8ec", textDim: "#b8b8c0", textMute: "#78788a",
    hover: "rgba(255,255,255,0.04)", danger: "#e06c75", warn: "#d4a857", success: "#8fbd7a",
    onAccent: "#ffffff", chipBg: "rgba(255,255,255,0.05)",
  },
  "tokyo-night": {
    bg: "#1a1b26", panel: "#1f2335", panelSolid: "#24283b", editorBg: "#16161e",
    border: "rgba(122,162,247,0.1)", text: "#c0caf5", textDim: "#a9b1d6", textMute: "#565f89",
    hover: "rgba(122,162,247,0.06)", danger: "#f7768e", warn: "#e0af68", success: "#9ece6a",
    onAccent: "#1a1b26", chipBg: "rgba(122,162,247,0.07)",
  },
  mocha: {
    bg: "#1e1e2e", panel: "#252536", panelSolid: "#2a2a3c", editorBg: "#181825",
    border: "rgba(205,214,244,0.08)", text: "#cdd6f4", textDim: "#bac2de", textMute: "#6c7086",
    hover: "rgba(205,214,244,0.05)", danger: "#f38ba8", warn: "#f9e2af", success: "#a6e3a1",
    onAccent: "#1e1e2e", chipBg: "rgba(205,214,244,0.06)",
  },
  "warm-dark": {
    bg: "#1d2021", panel: "#252829", panelSolid: "#282b2c", editorBg: "#1a1c1d",
    border: "rgba(235,219,178,0.1)", text: "#ebdbb2", textDim: "#d5c4a1", textMute: "#928374",
    hover: "rgba(235,219,178,0.06)", danger: "#fb4934", warn: "#fabd2f", success: "#b8bb26",
    onAccent: "#1d2021", chipBg: "rgba(235,219,178,0.07)",
  },
  light: {
    bg: "#eceef2", panel: "#f6f7fa", panelSolid: "#ffffff", editorBg: "#fafbfc",
    border: "rgba(30,35,50,0.12)", text: "#1a1f2e", textDim: "#3d4455", textMute: "#6b7280",
    hover: "rgba(30,35,50,0.05)", danger: "#c62828", warn: "#b8860b", success: "#2e7d32",
    onAccent: "#ffffff", chipBg: "rgba(30,35,50,0.06)", isLight: true,
  },
};

const LEGACY_THEME_IDS = new Set([
  "midnight", "nebula", "dracula", "nord", "one-dark", "gruvbox-dark",
]);

const THEME_MIGRATION: Record<string, string> = {
  midnight: "charcoal",
  nebula: "grokden-dark",
  dracula: "mocha",
  nord: "tokyo-night",
  "one-dark": "charcoal",
  "gruvbox-dark": "warm-dark",
};

export const ACCENTS: Record<string, [string, string]> = {
  slate: ["#5b8def", "#4a7fd4"],
  violet: ["#8b7cf8", "#9b8cf0"],
  teal: ["#2dd4bf", "#14b8a6"],
};

const LEGACY_ACCENT_IDS = new Set(["azure", "emerald", "amber", "rose"]);

const ACCENT_MIGRATION: Record<string, string> = {
  azure: "slate",
  emerald: "teal",
  amber: "slate",
  rose: "violet",
};

export const FONT_STACKS: Record<string, string> = {
  cascadia: "'Cascadia Code', 'Fira Code', Consolas, monospace",
  fira: "'Fira Code', 'Cascadia Code', Consolas, monospace",
  jetbrains: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  consolas: "Consolas, 'Cascadia Code', monospace",
};

export const themeList = [
  { id: "grokden-dark", label: "Grokden Dark", bg: "#13131a", text: "#b4b4c4", panel: "#111116" },
  { id: "charcoal", label: "Charcoal", bg: "#1e1e22", text: "#b8b8c0", panel: "#1a1a1e" },
  { id: "tokyo-night", label: "Tokyo Night", bg: "#24283b", text: "#a9b1d6", panel: "#1f2335" },
  { id: "mocha", label: "Mocha", bg: "#2a2a3c", text: "#bac2de", panel: "#252536" },
  { id: "warm-dark", label: "Warm Dark", bg: "#282b2c", text: "#d5c4a1", panel: "#252829" },
  { id: "light", label: "Grokden Light", bg: "#ffffff", text: "#3d4455", panel: "#f6f7fa" },
];

export const accentList = [
  { id: "slate", label: "Slate Blue", a: "#5b8def", b: "#4a7fd4" },
  { id: "violet", label: "Violet", a: "#8b7cf8", b: "#9b8cf0" },
  { id: "teal", label: "Teal", a: "#2dd4bf", b: "#14b8a6" },
];

export const settingsNav = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "keymap", label: "Keymap" },
  { id: "editor", label: "Editor" },
  { id: "languages", label: "Languages & Tools" },
  { id: "search-files", label: "Search & Files" },
  { id: "windows-layout", label: "Windows & Layout" },
  { id: "panels", label: "Panels" },
  { id: "debugger", label: "Debugger" },
  { id: "terminal", label: "Terminal" },
  { id: "version-control", label: "Version Control" },
  { id: "collaboration", label: "Collaboration" },
  { id: "ai", label: "AI" },
  { id: "network", label: "Network" },
  { id: "developer", label: "Developer" },
];

export const gitDiffModes = [
  { id: "inline", label: "Inline" },
  { id: "side-by-side", label: "Side by Side" },
];

export const grokModels = [
  { id: "grok-3", label: "Grok 3" },
  { id: "grok-3-mini", label: "Grok 3 Mini" },
  { id: "grok-2", label: "Grok 2" },
  { id: "grok-code", label: "Grok Code" },
];

export const titleBarStyles = [
  { id: "native", label: "Native" },
  { id: "custom", label: "Custom" },
  { id: "hidden", label: "Hidden" },
];

export const panelLocations = [
  { id: "bottom", label: "Bottom" },
  { id: "right", label: "Right" },
  { id: "left", label: "Left" },
];

export const sidebarLocations = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

export const breakpointBehaviors = [
  { id: "always", label: "Always" },
  { id: "never", label: "Never" },
  { id: "onException", label: "On Exception" },
];

export const terminalCursorStyles = [
  { id: "block", label: "Block" },
  { id: "underline", label: "Underline" },
  { id: "line", label: "Line" },
];

/** xterm.js `cursorStyle` values (maps our "line" style to xterm's "bar"). */
export type XtermCursorStyle = "block" | "underline" | "bar";

/** PowerShell executable used when `terminalShellPath` is empty on Windows. */
export const WINDOWS_POWERSHELL_PATH =
  "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

/**
 * Default value for `terminalShellPath`.
 * Returns an empty string so the backend auto-detects the system shell
 * (on Windows: {@link WINDOWS_POWERSHELL_PATH}).
 */
export function defaultShellPath(): string {
  return "";
}

/** Maps app terminal cursor styles to xterm.js `cursorStyle` option values. */
export function getTerminalCursorStyle(style: TerminalCursorStyle): XtermCursorStyle {
  return style === "line" ? "bar" : style;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "grokden-dark",
  accent: "violet",
  fontSize: 13,
  lineHeight: 20,
  fontFamily: "cascadia",
  tabSize: 2,
  showLineNumbers: true,
  wordWrap: false,
  autoSave: false,
  confirmClose: false,
  showTerminalOnStart: false,
  startupBehavior: "restore",
  autoCheckUpdates: true,
  allowPrereleaseUpdates: false,
  telemetryEnabled: false,
  crashReportsEnabled: true,
  defaultOpenFolder: "",
  uiLanguage: "en",
  confirmBeforeQuit: true,
  uiDensity: "comfortable",
  enableAnimations: true,
  windowTransparency: 100,
  sidebarPosition: "left",
  iconTheme: "default",
  showBreadcrumbs: true,
  smoothScrolling: true,
  keybindingPreset: "default",
  chordTimeout: 500,
  vimMode: false,
  multiCursorModifier: "alt",
  enableChordKeybindings: true,
  keyRepeatDelay: 300,
  minimap: true,
  bracketPairColorization: true,
  formatOnSave: false,
  rulerColumn: 80,
  scrollBeyondLastLine: true,
  renderWhitespace: "boundary",
  stickyScroll: false,
  autoClosingBrackets: true,
  insertSpaces: true,
  cursorBlinking: "blink",
  cursorStyle: "line",
  defaultFormatter: "prettier",
  defaultLinter: "eslint",
  typescriptSdkPath: "",
  rustAnalyzerPath: "",
  eslintAutoFixOnSave: false,
  formatOnPaste: false,
  gitEnabled: true,
  gitAutoFetch: true,
  gitDiffMode: "inline",
  gitBlame: false,
  gitDefaultBranch: "main",
  gitSignCommits: false,
  gitPullRebase: false,
  liveShareEnabled: false,
  presenceIndicators: true,
  showCollaboratorCursors: true,
  shareOnOpen: false,
  grokModel: "grok-3",
  aiContextWindow: 128000,
  aiInlineSuggestions: true,
  aiAgentModeDefault: false,
  aiTemperature: 0.7,
  aiMaxTokens: 4096,
  aiIncludeOpenFiles: true,
  aiAutoContext: true,
  proxyUrl: "",
  offlineMode: false,
  requestTimeout: 30,
  useSystemProxy: true,
  tlsVerify: true,
  devTools: false,
  verboseLogging: false,
  experimentalFeatures: false,
  reloadOnSave: false,
  showRustLogs: false,
  enableSourceMaps: true,
  searchExcludePatterns: "**/node_modules/**, **/.git/**, **/dist/**",
  searchCaseSensitive: false,
  searchFollowSymlinks: true,
  fileNestingEnabled: true,
  searchUseRegex: false,
  searchWholeWord: false,
  filesExcludePatterns: "**/.git, **/node_modules, **/dist",
  searchIncludeIgnored: false,
  restoreWindows: true,
  zenMode: false,
  centeredLayout: false,
  titleBarStyle: "custom",
  openFoldersInNewWindow: false,
  windowRestoreFullscreen: true,
  panelDefaultLocation: "bottom",
  panelDefaultSize: 320,
  autoHidePanels: false,
  sidebarLocation: "left",
  panelMaximizeOnOpen: false,
  secondarySidebarDefault: "hidden",
  debugConsoleWordWrap: true,
  breakpointBehavior: "always",
  stepIntoFilters: "",
  debugOpenOnBreak: true,
  debugConfirmOnExit: true,
  debugInlineValues: true,
  terminalShellPath: defaultShellPath(), // "" = auto-detect (PowerShell on Windows)
  terminalFontSize: 14,
  terminalScrollback: 10000,
  terminalCopyOnSelect: false,
  terminalCursorStyle: "block",
  terminalGpuAcceleration: true,
  terminalBell: false,
  terminalPersistSession: false,
  onboardingCompleted: false,
  agentModePreset: "review-driven",
  terminalExecutionPolicy: "review-first",
  artifactReviewPolicy: "review-first",
  jsExecutionPolicy: "review-first",
  importSource: "fresh",
  extensionSetupMode: "recommended",
  privacyImprovementConsent: false,
};

export function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function fileMeta(name: string): FileMeta {
  return FILE_META[extOf(name)] ?? { label: "FILE", color: "var(--text-mute)" };
}

export function languageOf(name: string): string {
  return LANGUAGE_NAMES[extOf(name)] ?? "Plain Text";
}

export function isTextFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildThemeStyle(settings: AppSettings): string {
  const t = THEMES[settings.theme] ?? THEMES["grokden-dark"];
  return [
    `--bg:${t.bg}`,
    `--panel:${t.panel}`,
    `--panel-solid:${t.panelSolid}`,
    `--editor-bg:${t.editorBg}`,
    `--border:${t.border}`,
    `--text:${t.text}`,
    `--text-dim:${t.textDim}`,
    `--text-mute:${t.textMute}`,
    `--hover:${t.hover}`,
    `--danger:${t.danger}`,
    `--danger-soft:${hexToRgba(t.danger, t.isLight ? 0.1 : 0.14)}`,
    `--warn:${t.warn}`,
    `--warn-soft:${hexToRgba(t.warn, t.isLight ? 0.12 : 0.14)}`,
    `--success:${t.success}`,
    `--on-accent:${t.panelSolid}`,
    `--chip-bg:${t.chipBg}`,
    `--accent:${t.textDim}`,
    `--accent2:${t.text}`,
    `--accent-soft:${t.hover}`,
    `--accent-mid:${t.border}`,
    `--accent-strong:${t.border}`,
    `--accent-grad:none`,
    `--efs:${settings.fontSize}px`,
    `--elh:${settings.lineHeight}px`,
    `--etab:${settings.tabSize}`,
    `--code-font:${FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.cascadia}`,
  ].join(";");
}

export function loadSettings(): AppSettings {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem("Grokden.settings");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        if (parsed.theme === "aether-dark") parsed.theme = "grokden-dark";
        if (parsed.theme && LEGACY_THEME_IDS.has(parsed.theme)) {
          parsed.theme = THEME_MIGRATION[parsed.theme] ?? "grokden-dark";
        }
        if (parsed.theme && !THEMES[parsed.theme]) parsed.theme = "grokden-dark";
        if (parsed.accent && LEGACY_ACCENT_IDS.has(parsed.accent)) {
          parsed.accent = ACCENT_MIGRATION[parsed.accent] ?? "violet";
        }
        if (parsed.accent && !ACCENTS[parsed.accent]) parsed.accent = "violet";
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return { ...DEFAULT_SETTINGS };
}
