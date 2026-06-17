/** Minimum editor/main column along width or height (px). */
export const EDITOR_MIN = 200;

/** Activity rail width (px). */
export const RAIL_WIDTH = 298;
export const RAIL_WIDTH_COMPACT = 276;

/** Primary sidebar defaults and bounds (px). */
export const SIDEBAR_DEFAULT = 280;
export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 480;

/** Secondary sidebar defaults and bounds (px). */
export const SECONDARY_DEFAULT = 240;
export const SECONDARY_MIN = 180;
export const SECONDARY_MAX = 400;

/** Bottom / side panel bounds (px). */
export const PANEL_MIN_SIZE = 120;
export const PANEL_USER_MIN_SIZE = 160;
export const PANEL_MAX_SIZE = 640;
export const PANEL_MAX_RATIO = 0.55;

/** Tauri window minimums — safe default until solver syncs dynamic mins. */
export const WINDOW_MIN_WIDTH = 1080;
export const WINDOW_MIN_HEIGHT = 680;

/** Auto-collapse / restore hysteresis (px). */
export const COLLAPSE_HYSTERESIS = 40;
export const COMPACT_PROFILE_WIDTH = 1100;
export const MINIMAL_PROFILE_WIDTH = 800;
export const EDITOR_ONLY_PROFILE_WIDTH = 500;

/** Chrome heights by density (window + topbar + statusbar). */
export const CHROME_HEIGHT = {
  comfortable: 92,
  compact: 84,
  spacious: 108,
} as const;

export const TOPBAR_HEIGHT = {
  comfortable: 36,
  compact: 32,
  spacious: 48,
} as const;

/** Centered editor max width (character-based approx via ch unit in CSS). */
export const CENTERED_EDITOR_MAX_CH = 100;
