/** Centralized design token system for the Grokden Liquid Glass UI. */

// ── Spacing ──────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px',
  '2xl': '16px', '3xl': '24px', '4xl': '32px', '5xl': '48px',
} as const;

// ── Typography ───────────────────────────────────────────────────────────────
export const FONT_SIZE = {
  xs: '11px', sm: '12px', base: '13px', lg: '14px', xl: '16px',
  '2xl': '18px', '3xl': '20px', '4xl': '24px',
} as const;

export const FONT_WEIGHT = {
  regular: 400, medium: 500, semibold: 600, bold: 700,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2, normal: 1.4, relaxed: 1.6, loose: 1.8,
} as const;

// ── Border radius ────────────────────────────────────────────────────────────
export const RADIUS = {
  xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px', full: '9999px',
} as const;

// ── Elevation / shadows ──────────────────────────────────────────────────────
export const SHADOW = {
  sm: '0 1px 2px rgba(0,0,0,0.08)',
  md: '0 4px 8px rgba(0,0,0,0.12)',
  lg: '0 8px 16px rgba(0,0,0,0.16)',
  xl: '0 16px 32px rgba(0,0,0,0.20)',
  '2xl': '0 24px 48px rgba(0,0,0,0.24)',
  inset: 'inset 0 1px 2px rgba(0,0,0,0.1)',
} as const;

// ── Focus ring ───────────────────────────────────────────────────────────────
export const FOCUS = {
  width: '2px',
  offset: '2px',
} as const;
