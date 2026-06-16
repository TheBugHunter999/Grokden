export type ThemePreviewSpec = {
  id: string;
  label: string;
  frame: string;
  sidebar: string;
  editor: string;
  accent: string;
  lines: string[];
};

export const ONBOARDING_THEMES: ThemePreviewSpec[] = [
  {
    id: "grokden-dark",
    label: "Grokden Dark",
    frame: "#1a1a22",
    sidebar: "#14141a",
    editor: "#111116",
    accent: "#8b7cf8",
    lines: ["#c678dd", "#e06c75", "#8b7cf8", "#e5c07b"],
  },
  {
    id: "charcoal",
    label: "Charcoal",
    frame: "#1e1e22",
    sidebar: "#1a1a1e",
    editor: "#141416",
    accent: "#5b8def",
    lines: ["#8fbd7a", "#e06c75", "#5b8def", "#d4a857"],
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    frame: "#24283b",
    sidebar: "#1f2335",
    editor: "#16161e",
    accent: "#7aa2f7",
    lines: ["#bb9af7", "#f7768e", "#7aa2f7", "#e0af68"],
  },
  {
    id: "light",
    label: "Grokden Light",
    frame: "#e8eaef",
    sidebar: "#f0f2f6",
    editor: "#fafbfc",
    accent: "#5b8def",
    lines: ["#7c3aed", "#dc2626", "#2563eb", "#ca8a04"],
  },
];