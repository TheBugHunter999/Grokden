/** Canonical Grokden theme palettes.
 * GROKDEN-FIX: Pass 3 removed the old Premium Grok class-overlay theme.
 * Every selectable theme now lives here and flows through buildThemeStyle.
 */

export type ThemeGlassTuning = {
  tintHue: number;
  refraction: number;
  blurMultiplier: number;
  specularStrength: number;
  sheenStrength: number;
  contrastEdgeStrength: number;
  aberrationBias: number;
  isLight: boolean;
};

export type TerminalPalette = {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
};

/** Canonical theme token contract — all themes must implement every field. */
export type ThemePalette = {
  bg: string;
  panel: string;
  panelSolid: string;
  editorBg: string;
  chrome: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  surfaceInset: string;
  border: string;
  borderStrong: string;
  borderMuted: string;
  divider: string;
  text: string;
  textDim: string;
  textMute: string;
  textDisabled: string;
  hover: string;
  hoverStrong: string;
  active: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  onAccent: string;
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  danger: string;
  onDanger: string;
  info: string;
  onInfo: string;
  /** @deprecated Use `warning` — kept for palette authoring parity. */
  warn: string;
  chipBg: string;
  scrollbar: string;
  scrollbarHover: string;
  selection: string;
  terminal: TerminalPalette;
  glass: ThemeGlassTuning;
  isLight?: boolean;
};

function withWarn(theme: Omit<ThemePalette, "warn">): ThemePalette {
  return { ...theme, warn: theme.warning };
}

const darkTerminal: TerminalPalette = {
  black: "#121217",
  red: "#f07178",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e5e7eb",
  brightBlack: "#6b7280",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#ffffff",
};

export const THEMES: Record<string, ThemePalette> = {
  "premium-grok": withWarn({
    bg: "#060608",
    surfaceInset: "#0b0b0f",
    panel: "#101015",
    panelSolid: "#16161c",
    editorBg: "#060608",
    chrome: "#0b0b0f",
    surfaceRaised: "#1e1e26",
    surfaceOverlay: "rgba(22,22,28,0.92)",
    border: "rgba(255,255,255,0.07)",
    borderStrong: "rgba(255,255,255,0.14)",
    borderMuted: "rgba(255,255,255,0.045)",
    divider: "rgba(255,255,255,0.06)",
    text: "#ececf1",
    textDim: "#a8a8b3",
    textMute: "#868696",
    textDisabled: "rgba(236,236,241,0.38)",
    hover: "rgba(255,255,255,0.055)",
    hoverStrong: "rgba(255,255,255,0.10)",
    active: "rgba(139,92,246,0.16)",
    accent: "#8b5cf6",
    accentHover: "#7c3aed",
    accentMuted: "#a78bfa",
    onAccent: "#ffffff",
    success: "#22c55e",
    onSuccess: "#06140b",
    warning: "#f59e0b",
    onWarning: "#1a1000",
    danger: "#f87171",
    onDanger: "#160606",
    info: "#22d3ee",
    onInfo: "#031114",
    chipBg: "rgba(255,255,255,0.065)",
    scrollbar: "rgba(255,255,255,0.24)",
    scrollbarHover: "rgba(255,255,255,0.38)",
    selection: "rgba(139,92,246,0.24)",
    terminal: {
      ...darkTerminal,
      black: "#08080c",
      brightBlack: "#747484",
      blue: "#7aa2ff",
      magenta: "#a78bfa",
      brightMagenta: "#c4b5fd",
      cyan: "#5eead4",
      brightCyan: "#99f6e4",
    },
    glass: {
      tintHue: 270,
      refraction: 1.16,
      blurMultiplier: 1.12,
      specularStrength: 1.18,
      sheenStrength: 1.08,
      contrastEdgeStrength: 1.12,
      aberrationBias: 0.46,
      isLight: false,
    },
    isLight: false,
  }),

  codex: withWarn({
    bg: "#231e19",
    surfaceInset: "#1b1713",
    panel: "#1a120a",
    panelSolid: "#181008",
    editorBg: "#211c17",
    chrome: "#130a03",
    surfaceRaised: "#2c251f",
    surfaceOverlay: "rgba(24,16,8,0.92)",
    border: "rgba(248,250,252,0.08)",
    borderStrong: "rgba(248,250,252,0.14)",
    borderMuted: "rgba(248,250,252,0.045)",
    divider: "rgba(248,250,252,0.06)",
    text: "#f1efea",
    textDim: "#d0c7bb",
    textMute: "#b6aa9c",
    textDisabled: "rgba(241,239,234,0.38)",
    hover: "rgba(248,250,252,0.055)",
    hoverStrong: "rgba(248,250,252,0.10)",
    active: "rgba(248,250,252,0.13)",
    accent: "#d67e5b",
    accentHover: "#e49370",
    accentMuted: "#d9a18b",
    onAccent: "#241006",
    success: "#46c88a",
    onSuccess: "#06140b",
    warning: "#d9b15b",
    onWarning: "#1a1000",
    danger: "#e87070",
    onDanger: "#160606",
    info: "#7aa2f7",
    onInfo: "#071224",
    chipBg: "rgba(248,250,252,0.065)",
    scrollbar: "rgba(248,250,252,0.24)",
    scrollbarHover: "rgba(248,250,252,0.38)",
    selection: "rgba(214,126,91,0.24)",
    terminal: {
      black: "#1e1d1b", red: "#e87070", green: "#4ecf8e", yellow: "#d4a84f",
      blue: "#6aa8f5", magenta: "#c88fd4", cyan: "#5ec4d4", white: "#eceae6",
      brightBlack: "#7a7772", brightRed: "#f5a0a0", brightGreen: "#7ee0ac", brightYellow: "#e8c878",
      brightBlue: "#94c0fa", brightMagenta: "#ddb0e4", brightCyan: "#88dce8", brightWhite: "#faf9f7",
    },
    glass: {
      tintHue: 68, refraction: 1, blurMultiplier: 1, specularStrength: 1,
      sheenStrength: 1, contrastEdgeStrength: 1, aberrationBias: 0.35, isLight: false,
    },
    isLight: false,
  }),

  obsidian: withWarn({
    bg: "#05050c",
    surfaceInset: "#030309",
    panel: "#090815",
    panelSolid: "#0d0b1a",
    editorBg: "#070711",
    chrome: "#04030e",
    surfaceRaised: "#171524",
    surfaceOverlay: "rgba(13,11,26,0.92)",
    border: "rgba(248,250,252,0.08)",
    borderStrong: "rgba(248,250,252,0.14)",
    borderMuted: "rgba(248,250,252,0.045)",
    divider: "rgba(248,250,252,0.06)",
    text: "#eeeef8",
    textDim: "#c9c5db",
    textMute: "#aaa4c0",
    textDisabled: "rgba(238,238,248,0.38)",
    hover: "rgba(248,250,252,0.055)",
    hoverStrong: "rgba(248,250,252,0.10)",
    active: "rgba(126,112,236,0.16)",
    accent: "#7e70ec",
    accentHover: "#9587ff",
    accentMuted: "#b4a8f4",
    onAccent: "#ffffff",
    success: "#3ecf9a",
    onSuccess: "#06140b",
    warning: "#e8b04a",
    onWarning: "#1a1000",
    danger: "#f07070",
    onDanger: "#160606",
    info: "#5a9cf5",
    onInfo: "#071224",
    chipBg: "rgba(248,250,252,0.065)",
    scrollbar: "rgba(248,250,252,0.24)",
    scrollbarHover: "rgba(248,250,252,0.38)",
    selection: "rgba(126,112,236,0.24)",
    terminal: {
      black: "#12111a", red: "#f07070", green: "#3ecf9a", yellow: "#e8b04a",
      blue: "#5a9cf5", magenta: "#b888e8", cyan: "#58c8e8", white: "#e8e6f0",
      brightBlack: "#6e6c7e", brightRed: "#f8a8a8", brightGreen: "#6ee8b4", brightYellow: "#f0d070",
      brightBlue: "#88b8fa", brightMagenta: "#d0a8f8", brightCyan: "#88e0f8", brightWhite: "#f8f6ff",
    },
    glass: {
      tintHue: 285, refraction: 1.05, blurMultiplier: 1.08, specularStrength: 1.1,
      sheenStrength: 0.95, contrastEdgeStrength: 1.05, aberrationBias: 0.4, isLight: false,
    },
    isLight: false,
  }),

  aurora: withWarn({
    bg: "#070c17",
    surfaceInset: "#050916",
    panel: "#09101f",
    panelSolid: "#0d1426",
    editorBg: "#060a15",
    chrome: "#020616",
    surfaceRaised: "#161e31",
    surfaceOverlay: "rgba(13,20,38,0.92)",
    border: "rgba(248,250,252,0.08)",
    borderStrong: "rgba(248,250,252,0.14)",
    borderMuted: "rgba(248,250,252,0.045)",
    divider: "rgba(248,250,252,0.06)",
    text: "#edf3ff",
    textDim: "#c1cce2",
    textMute: "#9eadc8",
    textDisabled: "rgba(237,243,255,0.38)",
    hover: "rgba(248,250,252,0.055)",
    hoverStrong: "rgba(248,250,252,0.10)",
    active: "rgba(122,124,240,0.16)",
    accent: "#7a7cf0",
    accentHover: "#9294ff",
    accentMuted: "#a8b0f7",
    onAccent: "#ffffff",
    success: "#4cd4a0",
    onSuccess: "#06140b",
    warning: "#e8c050",
    onWarning: "#1a1000",
    danger: "#f07888",
    onDanger: "#160606",
    info: "#68a8f8",
    onInfo: "#071224",
    chipBg: "rgba(248,250,252,0.065)",
    scrollbar: "rgba(248,250,252,0.24)",
    scrollbarHover: "rgba(248,250,252,0.38)",
    selection: "rgba(122,124,240,0.24)",
    terminal: {
      black: "#10121c", red: "#f07888", green: "#4cd4a0", yellow: "#e8c050",
      blue: "#68a8f8", magenta: "#b890f8", cyan: "#58d0e8", white: "#dce4f5",
      brightBlack: "#5e6a85", brightRed: "#f8a0b0", brightGreen: "#78e8b8", brightYellow: "#f0d878",
      brightBlue: "#98c4ff", brightMagenta: "#d4b0ff", brightCyan: "#88e8ff", brightWhite: "#f0f4ff",
    },
    glass: {
      tintHue: 265, refraction: 1.12, blurMultiplier: 1.1, specularStrength: 1.15,
      sheenStrength: 1.05, contrastEdgeStrength: 1, aberrationBias: 0.5, isLight: false,
    },
    isLight: false,
  }),

  frost: withWarn({
    bg: "#f8fafc",
    surfaceInset: "#edf2f7",
    panel: "#ffffff",
    panelSolid: "#ffffff",
    editorBg: "#fbfdff",
    chrome: "#eef2f8",
    surfaceRaised: "#ffffff",
    surfaceOverlay: "rgba(255,255,255,0.94)",
    border: "rgba(15,23,42,0.10)",
    borderStrong: "rgba(15,23,42,0.16)",
    borderMuted: "rgba(15,23,42,0.05)",
    divider: "rgba(15,23,42,0.07)",
    text: "#172033",
    textDim: "#3b485f",
    textMute: "#60708a",
    textDisabled: "rgba(23,32,51,0.38)",
    hover: "rgba(15,23,42,0.05)",
    hoverStrong: "rgba(15,23,42,0.08)",
    active: "rgba(37,99,235,0.11)",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    accentMuted: "#5b7ff0",
    onAccent: "#ffffff",
    success: "#047857",
    onSuccess: "#ffffff",
    warning: "#b45309",
    onWarning: "#ffffff",
    danger: "#c53030",
    onDanger: "#ffffff",
    info: "#1d4ed8",
    onInfo: "#ffffff",
    chipBg: "rgba(15,23,42,0.05)",
    scrollbar: "rgba(15,23,42,0.20)",
    scrollbarHover: "rgba(15,23,42,0.34)",
    selection: "rgba(37,99,235,0.20)",
    terminal: {
      black: "#e2e6ee", red: "#c53030", green: "#047857", yellow: "#b45309",
      blue: "#1d4ed8", magenta: "#7c3aed", cyan: "#0e7490", white: "#1e293b",
      brightBlack: "#64748b", brightRed: "#dc2626", brightGreen: "#059669", brightYellow: "#d97706",
      brightBlue: "#2563eb", brightMagenta: "#6d28d9", brightCyan: "#0891b2", brightWhite: "#0f172a",
    },
    glass: {
      tintHue: 250, refraction: 0.55, blurMultiplier: 0.92, specularStrength: 0.7,
      sheenStrength: 0.65, contrastEdgeStrength: 1.25, aberrationBias: 0.2, isLight: true,
    },
    isLight: true,
  }),

  midnight: withWarn({
    bg: "#000000",
    surfaceInset: "#020202",
    panel: "#0a0a0a",
    panelSolid: "#101010",
    editorBg: "#050505",
    chrome: "#080808",
    surfaceRaised: "#1a1a1a",
    surfaceOverlay: "rgba(16,16,16,0.92)",
    border: "rgba(248,250,252,0.08)",
    borderStrong: "rgba(248,250,252,0.14)",
    borderMuted: "rgba(248,250,252,0.045)",
    divider: "rgba(248,250,252,0.06)",
    text: "#f1f1f1",
    textDim: "#c7c7c7",
    textMute: "#a7a7a7",
    textDisabled: "rgba(241,241,241,0.38)",
    hover: "rgba(248,250,252,0.055)",
    hoverStrong: "rgba(248,250,252,0.10)",
    active: "rgba(184,144,248,0.16)",
    accent: "#b890f8",
    accentHover: "#c5a4ff",
    accentMuted: "#d4b0ff",
    onAccent: "#10021f",
    success: "#78e8b8",
    onSuccess: "#06140b",
    warning: "#f0d878",
    onWarning: "#1a1000",
    danger: "#f8a0a0",
    onDanger: "#160606",
    info: "#98c4ff",
    onInfo: "#071224",
    chipBg: "rgba(248,250,252,0.065)",
    scrollbar: "rgba(248,250,252,0.24)",
    scrollbarHover: "rgba(248,250,252,0.38)",
    selection: "rgba(184,144,248,0.24)",
    terminal: {
      black: "#0a0a0a", red: "#f07070", green: "#4cd4a0", yellow: "#e8c050",
      blue: "#68a8f8", magenta: "#b890f8", cyan: "#58d0e8", white: "#e8e8e8",
      brightBlack: "#666666", brightRed: "#f8a0a0", brightGreen: "#78e8b8", brightYellow: "#f0d878",
      brightBlue: "#98c4ff", brightMagenta: "#d4b0ff", brightCyan: "#88e8ff", brightWhite: "#ffffff",
    },
    glass: {
      tintHue: 280, refraction: 1.15, blurMultiplier: 1.05, specularStrength: 1.2,
      sheenStrength: 0.9, contrastEdgeStrength: 1.15, aberrationBias: 0.45, isLight: false,
    },
    isLight: false,
  }),
};

export const themeList = Object.entries(THEMES).map(([id, t]) => ({
  id,
  label:
    id === "premium-grok"
      ? "Premium Grok"
      : id
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
  bg: t.bg,
  text: t.textDim,
  panel: t.panel,
}));
