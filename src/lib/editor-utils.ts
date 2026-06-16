export type FileMeta = { label: string; color: string };

export type SearchMatch = { path: string; name: string; line: number; text: string };

export type TitleBarStyle = "native" | "custom" | "hidden";
export type PanelLocation = "bottom" | "right" | "left";
export type SidebarLocation = "left" | "right";
export type BreakpointBehavior = "always" | "never" | "onException";
export type TerminalCursorStyle = "block" | "underline" | "line";

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
  midnight: {
    bg: "#0a0e18", panel: "#0f1524", panelSolid: "#111827", editorBg: "#0c111c",
    border: "rgba(147,175,220,0.12)", text: "#d8e0f0", textDim: "#a8b4cc", textMute: "#6b7894",
    hover: "rgba(130,170,255,0.07)", danger: "#f07178", warn: "#ebcb8b", success: "#a3be8c",
    onAccent: "#ffffff", chipBg: "rgba(130,170,255,0.08)",
  },
  nebula: {
    bg: "#0d0a12", panel: "#15101c", panelSolid: "#181220", editorBg: "#110e16",
    border: "rgba(200,160,220,0.1)", text: "#ece4f0", textDim: "#c4b4cc", textMute: "#8a7a94",
    hover: "rgba(180,120,200,0.08)", danger: "#ff6e8a", warn: "#f0c070", success: "#7fd4a0",
    onAccent: "#ffffff", chipBg: "rgba(200,140,220,0.08)",
  },
  dracula: {
    bg: "#282a36", panel: "#2e3040", panelSolid: "#313341", editorBg: "#262833",
    border: "rgba(255,255,255,0.09)", text: "#f8f8f2", textDim: "#d0d0dc", textMute: "#9aa0b8",
    hover: "rgba(255,255,255,0.06)", danger: "#ff5555", warn: "#f1fa8c", success: "#50fa7b",
    onAccent: "#282a36", chipBg: "rgba(255,255,255,0.07)",
  },
  "gruvbox-dark": {
    bg: "#1d2021", panel: "#252829", panelSolid: "#282b2c", editorBg: "#1a1c1d",
    border: "rgba(235,219,178,0.1)", text: "#ebdbb2", textDim: "#d5c4a1", textMute: "#928374",
    hover: "rgba(235,219,178,0.06)", danger: "#fb4934", warn: "#fabd2f", success: "#b8bb26",
    onAccent: "#1d2021", chipBg: "rgba(235,219,178,0.07)",
  },
  nord: {
    bg: "#2e3440", panel: "#343b49", panelSolid: "#3b4252", editorBg: "#2a3040",
    border: "rgba(216,222,233,0.1)", text: "#eceff4", textDim: "#d8dee9", textMute: "#9aa3b8",
    hover: "rgba(216,222,233,0.06)", danger: "#bf616a", warn: "#ebcb8b", success: "#a3be8c",
    onAccent: "#2e3440", chipBg: "rgba(216,222,233,0.07)",
  },
  "one-dark": {
    bg: "#282c34", panel: "#2e323a", panelSolid: "#31353f", editorBg: "#252830",
    border: "rgba(171,178,191,0.1)", text: "#abb2bf", textDim: "#9da5b4", textMute: "#6b7280",
    hover: "rgba(171,178,191,0.06)", danger: "#e06c75", warn: "#e5c07b", success: "#98c379",
    onAccent: "#ffffff", chipBg: "rgba(171,178,191,0.07)",
  },
  light: {
    bg: "#eceef2", panel: "#f6f7fa", panelSolid: "#ffffff", editorBg: "#fafbfc",
    border: "rgba(30,35,50,0.12)", text: "#1a1f2e", textDim: "#3d4455", textMute: "#6b7280",
    hover: "rgba(30,35,50,0.05)", danger: "#c62828", warn: "#b8860b", success: "#2e7d32",
    onAccent: "#ffffff", chipBg: "rgba(30,35,50,0.06)", isLight: true,
  },
};

export const ACCENTS: Record<string, [string, string]> = {
  violet: ["#8b7cf8", "#b04fd1"],
  azure: ["#3aa0ff", "#4fd1d9"],
  emerald: ["#3ddc84", "#2f8fd6"],
  amber: ["#f0a35c", "#ff6a3d"],
  rose: ["#ff6a9a", "#b04fd1"],
};

export const FONT_STACKS: Record<string, string> = {
  cascadia: "'Cascadia Code', 'Fira Code', Consolas, monospace",
  fira: "'Fira Code', 'Cascadia Code', Consolas, monospace",
  jetbrains: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  consolas: "Consolas, 'Cascadia Code', monospace",
};

export const themeList = [
  { id: "grokden-dark", label: "Grokden Dark", bg: "#13131a", accent: "#8b7cf8" },
  { id: "midnight", label: "Midnight", bg: "#111827", accent: "#5b9cf5" },
  { id: "nebula", label: "Nebula", bg: "#181220", accent: "#b87fd4" },
  { id: "dracula", label: "Dracula", bg: "#313341", accent: "#bd93f9" },
  { id: "gruvbox-dark", label: "Gruvbox Dark", bg: "#282b2c", accent: "#fe8019" },
  { id: "nord", label: "Nord", bg: "#3b4252", accent: "#88c0d0" },
  { id: "one-dark", label: "One Dark", bg: "#31353f", accent: "#61afef" },
  { id: "light", label: "Grokden Light", bg: "#ffffff", accent: "#5b4cdb" },
];

export const accentList = [
  { id: "violet", label: "Violet", a: "#8b7cf8", b: "#b04fd1" },
  { id: "azure", label: "Azure", a: "#3aa0ff", b: "#4fd1d9" },
  { id: "emerald", label: "Emerald", a: "#3ddc84", b: "#2f8fd6" },
  { id: "amber", label: "Amber", a: "#f0a35c", b: "#ff6a3d" },
  { id: "rose", label: "Rose", a: "#ff6a9a", b: "#b04fd1" },
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
  showTerminalOnStart: true,
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
  const ac = ACCENTS[settings.accent] ?? ACCENTS.violet;
  const softAlpha = t.isLight ? 0.14 : 0.12;
  const midAlpha = t.isLight ? 0.26 : 0.22;
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
    `--on-accent:${t.onAccent}`,
    `--chip-bg:${t.chipBg}`,
    `--accent:${ac[0]}`,
    `--accent2:${ac[1]}`,
    `--accent-soft:${hexToRgba(ac[0], softAlpha)}`,
    `--accent-mid:${hexToRgba(ac[0], midAlpha)}`,
    `--accent-strong:${hexToRgba(ac[0], 0.45)}`,
    `--accent-grad:linear-gradient(135deg, ${ac[0]}, ${ac[1]})`,
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
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return { ...DEFAULT_SETTINGS };
}
