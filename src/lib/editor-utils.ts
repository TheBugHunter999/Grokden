import { migrateLegacyBrandingStorage } from "$lib/branding";
import { THEMES, themeList, type ThemePalette } from "$lib/theme-palette";

export type { ThemePalette } from "$lib/theme-palette";
export { THEMES, themeList };

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
  glassRefraction: number;
  glassEdgeIntensity: number;
  glassChromaticAberration: number;
  reduceGlassEffects: boolean;
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

/** Section 7 — editor monospace stack (JetBrains Mono primary). */
export const GROK_FONT_MONO =
  '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace';

/** Section 7 — recommended editor font size range (px). */
export const GROK_EDITOR_FONT_SIZE_MIN = 12.5;
export const GROK_EDITOR_FONT_SIZE_MAX = 13;
export const GROK_EDITOR_LINE_HEIGHT = 1.5;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

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
  fontFamily: "jetbrains",
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
  glassRefraction: 50,
  glassEdgeIntensity: 50,
  glassChromaticAberration: 25,
  reduceGlassEffects: false,
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

/** Keep both ends of a string; ellipsis in the middle when over maxLen (Section 7). */
export function middleTruncate(text: string, maxLen: number, ellipsis = "…"): string {
  const value = text.trim();
  if (maxLen <= 0) return "";
  if (value.length <= maxLen) return value;
  if (ellipsis.length >= maxLen) return ellipsis.slice(0, maxLen);
  const keep = maxLen - ellipsis.length;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${value.slice(0, head)}${ellipsis}${value.slice(value.length - tail)}`;
}

/** Middle-ellipsis truncation for editor tab titles (Section 7). */
export function truncateTabTitle(name: string, maxLen = 28): string {
  return middleTruncate(name, maxLen);
}

export function buildThemeStyle(settings: AppSettings): string {
  const t = THEMES[settings.theme] ?? THEMES["codex"];
  const accent = ACCENTS[settings.accent] ?? ACCENTS.violet;
  const isLight = t.isLight ?? false;
  const accentSoft = hexToRgba(accent.default, isLight ? 0.12 : 0.18);
  const fontSize = settings.fontSize;
  const codeFont = FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.jetbrains;
  const term = t.terminal;
  return [
    // Base surfaces
    `--bg:${t.bg}`,
    `--panel:${t.panel}`,
    `--panel-solid:${t.panelSolid}`,
    `--editor-bg:${t.editorBg}`,
    `--chrome:${t.chrome}`,
    `--surface-raised:${t.surfaceRaised}`,
    `--surface-overlay:${t.surfaceOverlay}`,
    `--surface-inset:${t.surfaceInset}`,
    // Borders
    `--border:${t.border}`,
    `--border-strong:${t.borderStrong}`,
    `--border-muted:${t.borderMuted}`,
    `--divider:${t.divider}`,
    // Text
    `--text:${t.text}`,
    `--text-dim:${t.textDim}`,
    `--text-mute:${t.textMute}`,
    `--text-disabled:${t.textDisabled}`,
    // Interactive
    `--hover:${t.hover}`,
    `--hover-strong:${t.hoverStrong}`,
    `--active:${t.active}`,
    // Theme accent defaults (user accent overrides below)
    `--theme-accent:${t.accent}`,
    `--theme-accent-hover:${t.accentHover}`,
    `--theme-accent-muted:${t.accentMuted}`,
    `--theme-on-accent:${t.onAccent}`,
    // Status
    `--danger:${t.danger}`,
    `--on-danger:${t.onDanger}`,
    `--danger-soft:${hexToRgba(t.danger, isLight ? 0.10 : 0.14)}`,
    `--warning:${t.warning}`,
    `--warn:${t.warning}`,
    `--on-warning:${t.onWarning}`,
    `--warn-soft:${hexToRgba(t.warning, isLight ? 0.10 : 0.14)}`,
    `--success:${t.success}`,
    `--on-success:${t.onSuccess}`,
    `--success-soft:${hexToRgba(t.success, isLight ? 0.10 : 0.14)}`,
    `--info:${t.info}`,
    `--on-info:${t.onInfo}`,
    `--info-soft:${hexToRgba(t.info, isLight ? 0.10 : 0.14)}`,
    // Utility
    `--on-accent:${accent.onAccent}`,
    `--chip-bg:${t.chipBg}`,
    `--scrollbar:${t.scrollbar}`,
    `--scrollbar-hover:${t.scrollbarHover}`,
    `--selection:${t.selection}`,
    // Terminal palette (per-theme xterm)
    `--term-black:${term.black}`,
    `--term-red:${term.red}`,
    `--term-green:${term.green}`,
    `--term-yellow:${term.yellow}`,
    `--term-blue:${term.blue}`,
    `--term-magenta:${term.magenta}`,
    `--term-cyan:${term.cyan}`,
    `--term-white:${term.white}`,
    `--term-bright-black:${term.brightBlack}`,
    `--term-bright-red:${term.brightRed}`,
    `--term-bright-green:${term.brightGreen}`,
    `--term-bright-yellow:${term.brightYellow}`,
    `--term-bright-blue:${term.brightBlue}`,
    `--term-bright-magenta:${term.brightMagenta}`,
    `--term-bright-cyan:${term.brightCyan}`,
    `--term-bright-white:${term.brightWhite}`,
    // Accent system
    `--accent:${accent.default}`,
    `--accent2:${accent.strong}`,
    `--accent-muted:${accent.muted}`,
    `--accent-subtle:${accent.subtle}`,
    `--accent-soft:${accentSoft}`,
    `--accent-mid:${hexToRgba(accent.default, isLight ? 0.25 : 0.35)}`,
    `--accent-strong:${t.borderStrong}`,
    `--accent-grad:linear-gradient(135deg, ${accent.default}, ${accent.strong})`,
    // Focus
    `--focus-ring:${accent.default}`,
    // Typography & editor (legacy)
    `--efs:${fontSize}px`,
    `--elh:${settings.lineHeight}px`,
    `--etab:${settings.tabSize}`,
    `--code-font:${codeFont}`,
    // --grok-* design tokens (Section 4.3)
    `--grok-bg:${t.bg}`,
    `--grok-bg-elevated:${t.surfaceInset}`,
    `--grok-surface:${t.panel}`,
    `--grok-surface-2:${t.panelSolid}`,
    `--grok-surface-3:${t.surfaceRaised}`,
    `--grok-chrome:${t.chrome}`,
    `--grok-editor:${t.editorBg}`,
    `--grok-border:${t.border}`,
    `--grok-border-strong:${t.borderStrong}`,
    `--grok-border-muted:${t.borderMuted}`,
    `--grok-divider:${t.divider}`,
    `--grok-text:${t.text}`,
    `--grok-text-secondary:${t.textDim}`,
    `--grok-text-muted:${t.textMute}`,
    `--grok-text-disabled:${t.textDisabled}`,
    `--grok-hover:${t.hover}`,
    `--grok-hover-strong:${t.hoverStrong}`,
    `--grok-active:${t.active}`,
    `--grok-selection:${t.selection}`,
    `--grok-scrollbar:${t.scrollbar}`,
    `--grok-scrollbar-hover:${t.scrollbarHover}`,
    `--grok-chip-bg:${t.chipBg}`,
    `--grok-danger:${t.danger}`,
    `--grok-danger-soft:${hexToRgba(t.danger, isLight ? 0.10 : 0.14)}`,
    `--grok-warn:${t.warning}`,
    `--grok-warn-soft:${hexToRgba(t.warning, isLight ? 0.10 : 0.14)}`,
    `--grok-success:${t.success}`,
    `--grok-success-soft:${hexToRgba(t.success, isLight ? 0.10 : 0.14)}`,
    `--grok-info:${t.info}`,
    `--grok-info-soft:${hexToRgba(t.info, isLight ? 0.10 : 0.14)}`,
    `--grok-purple:${accent.default}`,
    `--grok-purple-strong:${accent.strong}`,
    `--grok-purple-muted:${accent.muted}`,
    `--grok-purple-soft:${accentSoft}`,
    `--grok-focus-ring:${accent.default}`,
    `--grok-font-mono:${GROK_FONT_MONO}`,
    `--grok-font-size-base:${fontSize}px`,
    `--grok-line-height-relaxed:${GROK_EDITOR_LINE_HEIGHT}`,
  ].join(";");
}

/** Editor-scoped --grok-* vars and runtime layout tokens (Section 4.3 + 7). */
export function buildEditorStyleVars(settings: AppSettings): string {
  const t = THEMES[settings.theme] ?? THEMES["codex"];
  const accent = ACCENTS[settings.accent] ?? ACCENTS.violet;
  const fontSize = settings.fontSize;
  const codeFont = FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.jetbrains;
  const tabSpace = settings.insertSpaces ? clamp(settings.tabSize, 1, 8) : 4;

  return [
    // Editor surface (Section 4.3)
    `--grok-editor:${t.editorBg}`,
    `--grok-editor-gutter:${t.panel}`,
    `--grok-editor-line-number:${t.textMute}`,
    `--grok-editor-active-line:${t.panelSolid}`,
    `--grok-editor-cursor:${accent.default}`,
    `--grok-editor-selection:${t.selection}`,
    // Typography (Section 7)
    `--grok-font-mono:${GROK_FONT_MONO}`,
    `--grok-font-size-editor:${fontSize}px`,
    `--grok-font-size-base:${fontSize}px`,
    `--grok-line-height-editor:${GROK_EDITOR_LINE_HEIGHT}`,
    `--grok-line-height-relaxed:${GROK_EDITOR_LINE_HEIGHT}`,
    // Legacy editor vars (preserve settings-driven sizing)
    `--efs:${fontSize}px`,
    `--elh:${settings.lineHeight}px`,
    `--etab:${settings.tabSize}`,
    `--code-font:${codeFont}`,
    `--tab-space:${tabSpace}`,
    `--key-repeat-delay:${settings.keyRepeatDelay}ms`,
    `--chord-timeout:${settings.chordTimeout}ms`,
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
