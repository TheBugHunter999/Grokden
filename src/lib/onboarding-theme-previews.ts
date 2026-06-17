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
    id: "codex",
    label: "Codex",
    frame: "#3a3a37",
    sidebar: "#211b26",
    editor: "#2d2d2b",
    accent: "#cc7d5e",
    lines: ["#f0a88a", "#d8a657", "#7aa2f7", "#0eae59"],
  },
  {
    id: "obsidian",
    label: "Obsidian",
    frame: "#1a1a22",
    sidebar: "#14141b",
    editor: "#101015",
    accent: "#8b5cf6",
    lines: ["#c678dd", "#ef4444", "#8b5cf6", "#f59e0b"],
  },
  {
    id: "aurora",
    label: "Aurora",
    frame: "#232730",
    sidebar: "#1d2029",
    editor: "#181b24",
    accent: "#8b5cf6",
    lines: ["#a78bfa", "#f87171", "#60a5fa", "#fbbf24"],
  },
  {
    id: "frost",
    label: "Frost",
    frame: "#e8eaef",
    sidebar: "#f0f2f6",
    editor: "#ffffff",
    accent: "#3b82f6",
    lines: ["#7c3aed", "#dc2626", "#2563eb", "#ca8a04"],
  },
  {
    id: "midnight",
    label: "Midnight",
    frame: "#161616",
    sidebar: "#0f0f0f",
    editor: "#0a0a0a",
    accent: "#8b5cf6",
    lines: ["#a78bfa", "#f87171", "#60a5fa", "#fbbf24"],
  },
];
