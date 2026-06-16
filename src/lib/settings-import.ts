import type { AppSettings } from "$lib/editor-utils";
import type { ImportSource } from "$lib/editor-utils";

export type ExtensionInfo = {
  id: string;
  name: string;
  version?: string | null;
};

export type EditorImportResult = {
  found: boolean;
  source: string;
  settings_path?: string | null;
  settings: Record<string, unknown>;
  extensions: ExtensionInfo[];
};

const THEME_MAP: Record<string, string> = {
  "Default Dark Modern": "grokden-dark",
  "Default Dark+": "charcoal",
  "Visual Studio Dark": "charcoal",
  "Dark+ (default dark)": "charcoal",
  "Default Light Modern": "light",
  "Default Light+": "light",
  Dracula: "mocha",
  "Dracula Soft": "mocha",
  Nord: "tokyo-night",
  "Gruvbox Dark Hard": "warm-dark",
  "Gruvbox Dark Medium": "warm-dark",
  "Tokyo Night": "tokyo-night",
  "Catppuccin Mocha": "mocha",
};

const FONT_MAP: Record<string, AppSettings["fontFamily"]> = {
  "Cascadia Code": "cascadia",
  "Fira Code": "fira",
  "JetBrains Mono": "jetbrains",
  Consolas: "consolas",
};

export const RECOMMENDED_EXTENSIONS = [
  { id: "rust-analyzer", name: "Rust Analyzer", reason: "Rust language support" },
  { id: "svelte", name: "Svelte", reason: "Svelte component tooling" },
  { id: "eslint", name: "ESLint", reason: "JavaScript linting" },
  { id: "prettier", name: "Prettier", reason: "Code formatting" },
  { id: "tailwindcss", name: "Tailwind CSS IntelliSense", reason: "Utility class completion" },
];

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function mapImportedSettings(
  source: ImportSource,
  imported: Record<string, unknown>,
): Partial<AppSettings> {
  const partial: Partial<AppSettings> = {
    importSource: source,
    keybindingPreset: "vscode",
  };

  const workbenchTheme = readString(imported["workbench.colorTheme"]);
  if (workbenchTheme && THEME_MAP[workbenchTheme]) {
    partial.theme = THEME_MAP[workbenchTheme];
  }

  const fontSize = readNumber(imported["editor.fontSize"]);
  if (fontSize) partial.fontSize = Math.round(Math.min(24, Math.max(10, fontSize)));

  const lineHeight = readNumber(imported["editor.lineHeight"]);
  if (lineHeight) partial.lineHeight = Math.round(Math.min(32, Math.max(14, lineHeight)));

  const tabSize = readNumber(imported["editor.tabSize"]);
  if (tabSize) partial.tabSize = Math.round(Math.min(8, Math.max(1, tabSize)));

  const fontFamilyRaw = readString(imported["editor.fontFamily"]);
  if (fontFamilyRaw) {
    const first = fontFamilyRaw.split(",")[0]?.replace(/['"]/g, "").trim();
    if (first && FONT_MAP[first]) partial.fontFamily = FONT_MAP[first];
  }

  const wordWrap = readString(imported["editor.wordWrap"]);
  if (wordWrap) partial.wordWrap = wordWrap !== "off";

  const minimap = readBoolean(imported["editor.minimap.enabled"]);
  if (minimap !== undefined) partial.minimap = minimap;

  const formatOnSave = readBoolean(imported["editor.formatOnSave"]);
  if (formatOnSave !== undefined) partial.formatOnSave = formatOnSave;

  const insertSpaces = readBoolean(imported["editor.insertSpaces"]);
  if (insertSpaces !== undefined) partial.insertSpaces = insertSpaces;

  const terminalFontSize = readNumber(imported["terminal.integrated.fontSize"]);
  if (terminalFontSize) {
    partial.terminalFontSize = Math.round(Math.min(24, Math.max(10, terminalFontSize)));
  }

  const shellPath = readString(imported["terminal.integrated.shell.windows"])
    ?? readString(imported["terminal.integrated.defaultProfile.windows"]);
  if (shellPath) partial.terminalShellPath = shellPath;

  return partial;
}

export function mergeImportedIntoDraft<T extends { importSource: ImportSource }>(
  draft: T,
  partial: Partial<AppSettings>,
): T & Partial<AppSettings> {
  return { ...draft, ...partial };
}