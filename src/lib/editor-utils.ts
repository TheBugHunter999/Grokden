import { migrateLegacyBrandingStorage } from "$lib/branding";

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
  // Base surfaces
  bg: string;
  panel: string;
  panelSolid: string;
  editorBg: string;
  // Additional surfaces
  surfaceRaised: string;
  surfaceOverlay: string;
  surfaceInset: string;
  // Borders & dividers
  border: string;
  borderStrong: string;
  borderMuted: string;
  // Text hierarchy
  text: string;
  textDim: string;
  textMute: string;
  textDisabled: string;
  // Interactive
  hover: string;
  hoverStrong: string;
  active: string;
  // Semantic status
  danger: string;
  warn: string;
  success: string;
  info: string;
  // Utility
  onAccent: string;
  chipBg: string;
  scrollbar: string;
  scrollbarHover: string;
  selection: string;
  // Flags
  isLight?: boolean;
};

export const THEMES: Record<string, ThemePalette> = {
  codex: {
    bg: "#2d2d2b", panel: "#211b26", panelSolid: "#202024", editorBg: "#2b2b29",
    surfaceRaised: "#3a3a37", surfaceOverlay: "rgba(32,32,36,0.94)", surfaceInset: "#262624",
    border: "rgba(255,255,255,0.075)", borderStrong: "rgba(255,255,255,0.14)", borderMuted: "rgba(255,255,255,0.045)",
    text: "#f4f4f2", textDim: "#cececa", textMute: "#8f8b91", textDisabled: "rgba(244,244,242,0.35)",
    hover: "rgba(255,255,255,0.055)", hoverStrong: "rgba(255,255,255,0.10)", active: "rgba(255,255,255,0.13)",
    danger: "#f87171", warn: "#d8a657", success: "#0eae59", info: "#7aa2f7",
    onAccent: "#ffffff", chipBg: "rgba(255,255,255,0.065)",
    scrollbar: "rgba(255,255,255,0.24)", scrollbarHover: "rgba(255,255,255,0.38)",
    selection: "rgba(204,125,94,0.24)",
  },
  obsidian: {
    bg: "#0a0a0f", panel: "#101015", panelSolid: "#14141b", editorBg: "#0c0c11",
    surfaceRaised: "#1a1a22", surfaceOverlay: "rgba(10,10,15,0.92)", surfaceInset: "#08080c",
    border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.14)", borderMuted: "rgba(255,255,255,0.04)",
    text: "#e8e8f0", textDim: "#b0b0c0", textMute: "#6a6a7e", textDisabled: "rgba(232,232,240,0.35)",
    hover: "rgba(255,255,255,0.05)", hoverStrong: "rgba(255,255,255,0.09)", active: "rgba(255,255,255,0.12)",
    danger: "#ef4444", warn: "#f59e0b", success: "#10b981", info: "#3b82f6",
    onAccent: "#ffffff", chipBg: "rgba(255,255,255,0.06)",
    scrollbar: "rgba(255,255,255,0.22)", scrollbarHover: "rgba(255,255,255,0.38)",
    selection: "rgba(91,141,239,0.25)",
  },
  aurora: {
    bg: "#11131a", panel: "#181b24", panelSolid: "#1d2029", editorBg: "#0f1118",
    surfaceRaised: "#232730", surfaceOverlay: "rgba(17,19,26,0.92)", surfaceInset: "#0c0e14",
    border: "rgba(148,163,224,0.10)", borderStrong: "rgba(148,163,224,0.18)", borderMuted: "rgba(148,163,224,0.05)",
    text: "#dce4f5", textDim: "#a8b4d0", textMute: "#5e6a85", textDisabled: "rgba(220,228,245,0.35)",
    hover: "rgba(148,163,224,0.06)", hoverStrong: "rgba(148,163,224,0.11)", active: "rgba(148,163,224,0.15)",
    danger: "#f87171", warn: "#fbbf24", success: "#34d399", info: "#60a5fa",
    onAccent: "#0f1118", chipBg: "rgba(148,163,224,0.07)",
    scrollbar: "rgba(148,163,224,0.22)", scrollbarHover: "rgba(148,163,224,0.38)",
    selection: "rgba(139,124,248,0.25)",
  },
  frost: {
    bg: "#f5f7fb", panel: "#ffffff", panelSolid: "#ffffff", editorBg: "#fafbfe",
    surfaceRaised: "#ffffff", surfaceOverlay: "rgba(255,255,255,0.95)", surfaceInset: "#eef1f7",
    border: "rgba(15,23,42,0.09)", borderStrong: "rgba(15,23,42,0.16)", borderMuted: "rgba(15,23,42,0.05)",
    text: "#0f172a", textDim: "#334155", textMute: "#64748b", textDisabled: "rgba(15,23,42,0.35)",
    hover: "rgba(15,23,42,0.04)", hoverStrong: "rgba(15,23,42,0.07)", active: "rgba(15,23,42,0.10)",
    danger: "#dc2626", warn: "#d97706", success: "#059669", info: "#2563eb",
    onAccent: "#ffffff", chipBg: "rgba(15,23,42,0.05)",
    scrollbar: "rgba(15,23,42,0.18)", scrollbarHover: "rgba(15,23,42,0.32)",
    selection: "rgba(37,99,235,0.18)",
    isLight: true,
  },
  midnight: {
    bg: "#000000", panel: "#0a0a0a", panelSolid: "#0f0f0f", editorBg: "#050505",
    surfaceRaised: "#161616", surfaceOverlay: "rgba(0,0,0,0.95)", surfaceInset: "#000000",
    border: "rgba(255,255,255,0.10)", borderStrong: "rgba(255,255,255,0.18)", borderMuted: "rgba(255,255,255,0.05)",
    text: "#f0f0f0", textDim: "#a3a3a3", textMute: "#666666", textDisabled: "rgba(240,240,240,0.30)",
    hover: "rgba(255,255,255,0.06)", hoverStrong: "rgba(255,255,255,0.10)", active: "rgba(255,255,255,0.14)",
    danger: "#f87171", warn: "#fbbf24", success: "#34d399", info: "#60a5fa",
    onAccent: "#000000", chipBg: "rgba(255,255,255,0.06)",
    scrollbar: "rgba(255,255,255,0.20)", scrollbarHover: "rgba(255,255,255,0.36)",
    selection: "rgba(139,124,248,0.30)",
  },
};

const LEGACY_THEME_IDS = new Set([
  "midnight", "nebula", "dracula", "nord", "one-dark", "gruvbox-dark",
  "grokden-dark", "charcoal", "tokyo-night", "mocha", "warm-dark", "light",
]);

const THEME_MIGRATION: Record<string, string> = {
  midnight: "midnight",
  nebula: "codex",
  dracula: "aurora",
  nord: "aurora",
  "one-dark": "obsidian",
  "gruvbox-dark": "aurora",
  "grokden-dark": "codex",
  charcoal: "codex",
  "tokyo-night": "aurora",
  mocha: "aurora",
  "warm-dark": "aurora",
  light: "frost",
};

export type AccentPalette = {
  default: string;
  strong: string;
  muted: string;
  subtle: string;
  onAccent: string;
};

export const ACCENTS: Record<string, AccentPalette> = {
  coral: { default: "#cc7d5e", strong: "#e18b68", muted: "#f0a88a", subtle: "#fbe3d8", onAccent: "#ffffff" },
  blue: { default: "#3b82f6", strong: "#2563eb", muted: "#60a5fa", subtle: "#dbeafe", onAccent: "#ffffff" },
  violet: { default: "#8b5cf6", strong: "#7c3aed", muted: "#a78bfa", subtle: "#ede9fe", onAccent: "#ffffff" },
  teal: { default: "#14b8a6", strong: "#0d9488", muted: "#2dd4bf", subtle: "#ccfbf1", onAccent: "#ffffff" },
  rose: { default: "#f43f5e", strong: "#e11d48", muted: "#fb7185", subtle: "#ffe4e6", onAccent: "#ffffff" },
  amber: { default: "#f59e0b", strong: "#d97706", muted: "#fbbf24", subtle: "#fef3c7", onAccent: "#1a1a1a" },
  emerald: { default: "#10b981", strong: "#059669", muted: "#34d399", subtle: "#d1fae5", onAccent: "#ffffff" },
};

const LEGACY_ACCENT_IDS = new Set(["azure", "slate", "teal"]);

const ACCENT_MIGRATION: Record<string, string> = {
  azure: "blue",
  slate: "blue",
  emerald: "emerald",
  amber: "amber",
  rose: "rose",
};

export const FONT_STACKS: Record<string, string> = {
  cascadia: "'Cascadia Code', 'Fira Code', Consolas, monospace",
  fira: "'Fira Code', 'Cascadia Code', Consolas, monospace",
  jetbrains: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  consolas: "Consolas, 'Cascadia Code', monospace",
};

export const themeList = [
  { id: "codex", label: "Codex", bg: "#2d2d2b", text: "#cececa", panel: "#211b26" },
  { id: "obsidian", label: "Obsidian", bg: "#14141b", text: "#b0b0c0", panel: "#101015" },
  { id: "aurora", label: "Aurora", bg: "#1d2029", text: "#a8b4d0", panel: "#181b24" },
  { id: "frost", label: "Frost", bg: "#ffffff", text: "#334155", panel: "#ffffff" },
  { id: "midnight", label: "Midnight", bg: "#0f0f0f", text: "#a3a3a3", panel: "#0a0a0a" },
];

export const accentList = [
  { id: "coral", label: "Coral" },
  { id: "blue", label: "Blue" },
  { id: "violet", label: "Violet" },
  { id: "teal", label: "Teal" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" },
  { id: "emerald", label: "Emerald" },
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

/** Model IDs returned by `grok models` (Grok Build CLI). */
export const grokModels = [
  { id: "grok-build", label: "Grok Build" },
  { id: "grok-composer-2.5-fast", label: "Grok Composer 2.5 Fast" },
];

const LEGACY_GROK_MODEL_IDS = new Set([
  "grok-3",
  "grok-3-mini",
  "grok-2",
  "grok-code",
  "grok-code-fast",
  "grok-4",
  "grok-4.3",
]);

export function migrateGrokModel(model: string | undefined): string {
  if (!model || LEGACY_GROK_MODEL_IDS.has(model)) return "grok-build";
  if (grokModels.some((entry) => entry.id === model)) return model;
  return "grok-build";
}

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
  theme: "codex",
  accent: "coral",
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
  windowTransparency: 72,
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
  minimap: false,
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
  grokModel: "grok-build",
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
  windowRestoreFullscreen: false,
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
  const t = THEMES[settings.theme] ?? THEMES["codex"];
  const accent = ACCENTS[settings.accent] ?? ACCENTS.violet;
  const isLight = t.isLight ?? false;
  return [
    // Base surfaces
    `--bg:${t.bg}`,
    `--panel:${t.panel}`,
    `--panel-solid:${t.panelSolid}`,
    `--editor-bg:${t.editorBg}`,
    `--surface-raised:${t.surfaceRaised}`,
    `--surface-overlay:${t.surfaceOverlay}`,
    `--surface-inset:${t.surfaceInset}`,
    // Borders
    `--border:${t.border}`,
    `--border-strong:${t.borderStrong}`,
    `--border-muted:${t.borderMuted}`,
    // Text
    `--text:${t.text}`,
    `--text-dim:${t.textDim}`,
    `--text-mute:${t.textMute}`,
    `--text-disabled:${t.textDisabled}`,
    // Interactive
    `--hover:${t.hover}`,
    `--hover-strong:${t.hoverStrong}`,
    `--active:${t.active}`,
    // Status
    `--danger:${t.danger}`,
    `--danger-soft:${hexToRgba(t.danger, isLight ? 0.10 : 0.14)}`,
    `--warn:${t.warn}`,
    `--warn-soft:${hexToRgba(t.warn, isLight ? 0.10 : 0.14)}`,
    `--success:${t.success}`,
    `--success-soft:${hexToRgba(t.success, isLight ? 0.10 : 0.14)}`,
    `--info:${t.info}`,
    `--info-soft:${hexToRgba(t.info, isLight ? 0.10 : 0.14)}`,
    // Utility
    `--on-accent:${accent.onAccent}`,
    `--chip-bg:${t.chipBg}`,
    `--scrollbar:${t.scrollbar}`,
    `--scrollbar-hover:${t.scrollbarHover}`,
    `--selection:${t.selection}`,
    // Accent system
    `--accent:${accent.default}`,
    `--accent2:${accent.strong}`,
    `--accent-muted:${accent.muted}`,
    `--accent-subtle:${accent.subtle}`,
    `--accent-soft:${hexToRgba(accent.default, isLight ? 0.12 : 0.18)}`,
    `--accent-mid:${hexToRgba(accent.default, isLight ? 0.25 : 0.35)}`,
    `--accent-strong:${t.borderStrong}`,
    `--accent-grad:linear-gradient(135deg, ${accent.default}, ${accent.strong})`,
    // Focus
    `--focus-ring:${accent.default}`,
    // Typography & editor
    `--efs:${settings.fontSize}px`,
    `--elh:${settings.lineHeight}px`,
    `--etab:${settings.tabSize}`,
    `--code-font:${FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.cascadia}`,
  ].join(";");
}

export function loadSettings(): AppSettings {
  try {
    if (typeof localStorage !== "undefined") {
      migrateLegacyBrandingStorage();
      const raw = localStorage.getItem("Grokden.settings");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        if (parsed.theme === "aether-dark") parsed.theme = "codex";
        if (parsed.theme && LEGACY_THEME_IDS.has(parsed.theme)) {
          parsed.theme = THEME_MIGRATION[parsed.theme] ?? "codex";
        }
        if (parsed.theme && !THEMES[parsed.theme]) {
          parsed.theme = THEME_MIGRATION[parsed.theme] ?? "codex";
        }
        if (parsed.accent && LEGACY_ACCENT_IDS.has(parsed.accent)) {
          parsed.accent = ACCENT_MIGRATION[parsed.accent] ?? "violet";
        }
        if (parsed.accent && !ACCENTS[parsed.accent]) {
          parsed.accent = ACCENT_MIGRATION[parsed.accent] ?? "violet";
        }
        if (parsed.grokModel) parsed.grokModel = migrateGrokModel(parsed.grokModel);
        const glassMigrationKey = "Grokden.liquidGlassDefault.v1";
        const hasMigratedGlass = localStorage.getItem(glassMigrationKey) === "1";
        if (!hasMigratedGlass && (parsed.windowTransparency === undefined || parsed.windowTransparency === 100)) {
          parsed.windowTransparency = DEFAULT_SETTINGS.windowTransparency;
          localStorage.setItem(glassMigrationKey, "1");
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return { ...DEFAULT_SETTINGS };
}
