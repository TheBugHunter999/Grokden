# Theme Audit Report

Generated: 2026-06-19

## Summary

Manual Pass 3 audit after moving Premium Grok into the canonical theme map. `npm run` scripts were not run in the connector environment.

| Theme | Body text | Secondary | Accent | On accent |
|-------|-----------|-----------|--------|-----------|
| premium-grok | 17.19:1 PASS | 5.30:1 PASS | 4.78:1 PASS | 4.23:1 FAIL |
| codex | 14.38:1 PASS | 8.12:1 PASS | 5.50:1 PASS | 6.07:1 PASS |
| obsidian | 17.63:1 PASS | 8.31:1 PASS | 5.24:1 PASS | 3.88:1 FAIL |
| aurora | 17.57:1 PASS | 8.38:1 PASS | 5.56:1 PASS | 3.52:1 FAIL |
| frost | 15.55:1 PASS | 5.02:1 PASS | 4.94:1 PASS | 5.17:1 PASS |
| midnight | 18.59:1 PASS | 8.23:1 PASS | 8.38:1 PASS | 7.98:1 PASS |

## Notes

- Premium Grok now exists as `premium-grok` in `src/lib/theme-palette.ts` and is included by `themeList`.
- The old Premium Grok overlay CSS and JS files were deleted and unlinked.
- Body text, secondary text, and accent contrast pass for every theme in the manual check.
- `onAccent` needs a follow-up patch for `premium-grok`, `obsidian`, and `aurora`. Use a near-black value such as `#060608` or `#05050c` instead of `#ffffff` for those theme-level `onAccent` tokens.
