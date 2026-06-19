# Grokden UI Redesign Log

## Phase 1 — Design tokens

**File:** `static/grokden-tokens.css` (loaded first in `app.html`)

Canonical tokens for all five themes (`:root`/`obsidian`, `codex`, `aurora`, `frost`, `midnight`):

| Token | Purpose |
|-------|---------|
| `--bg`, `--bg-elevated`, `--panel`, `--panel-2`, `--surface-3` | Surface steps |
| `--border`, `--border-strong`, `--border-muted`, `--divider` | Hairline borders |
| `--text`, `--text-dim`, `--text-mute`, `--text-disabled` | Text tiers |
| `--accent`, `--accent-hover`, `--accent-soft`, `--accent-mid`, `--on-accent` | Accent system |
| `--hover`, `--hover-strong`, `--active`, `--selection` | Interactive states |
| `--danger/warn/success/info` + `-soft` variants | Status colors |
| `--focus-ring`, `--radius-*`, `--shadow-*` | Focus, radii, elevation |
| `--font-ui`, `--font-mono` | Typography |
| `--rail-width` (248px), `--rail-width-collapsed` (56px) | Sidebar layout |
| `--glass-*` | Glass recipe inputs |

`grokden-premium-theme.css` `--grok-*` bridge now aliases unified tokens.

`pickOnColor()` in `color-utils.ts` enforces WCAG AA 4.5:1 for `onAccent on accent`.

## Phase 2 — Glass system

**File:** `static/grokden-glass.css`

```css
.glass          /* standard floating chrome */
.glass--strong  /* dialogs, emphasis */
.glass--pill    /* pill-shaped bars */
```

Recipe: `var(--glass-bg)` + border + inset highlight + backdrop blur/saturate + `::before` specular sheen.

Fallbacks: `prefers-reduced-transparency` and no `backdrop-filter` support → solid `var(--panel)`.

Applied to: canvas toolbar, command pill, Parallel Agents toolbar/menus, Skills card.

## Phase 3 — Labeled sidebar

**Component:** `src/lib/Sidebar.svelte`  
**Styles:** `static/grokden-sidebar.css`

- Expanded: 248px labeled nav (Search, Primary, Workspace, Projects, History, Settings, user row)
- Collapsed: 56px icon-only via reused `ActivityRail.svelte`
- Persistence: `localStorage` key `Grokden.sidebar.collapsed`
- "Soon" badge on Skills & Connectors

## Phase 4–5 — Welcome hero + command pill

**Component:** `src/lib/WelcomeView.svelte`  
**Styles:** `grokden-supergrok-welcome.css`, `grokden-welcome.css`

- Real Svelte hero: "SuperGrok" + "HEAVY" pill (no JS injection)
- Glass command pill: `+` quick menu, mode dropdown (Heavy = `agent-driven`), disabled mic/waveform
- Ambient dot-plane + vignette (`.ambient-grid`, `.ambient-vignette`)

## Phase 6 — Skills & Connectors

**Component:** `src/lib/SkillsConnectors.svelte`  
**View id:** `"skills"` registered in `+page.svelte`

## Phase 7 — Shared primitives

**File:** `static/grokden-ui.css`

| Class | Use |
|-------|-----|
| `.btn`, `.btn--primary/secondary/ghost/danger` | Buttons |
| `.input`, `.select` | Form controls |
| `.card` | Canvas-style panels |
| `.chip`, `.badge`, `.eyebrow`, `.empty-state` | Labels / empty states |
| `.menu`, `.popover`, `.dialog` | Glass overlays |
| `.dark-scrollbar`, `.grok-scrollbar` | Themed scrollbars |

Restyled: `ParallelAgents` (`.card` panes, `.glass` toolbar), `Canvas` toolbar.

## Legacy CSS removals

_(Phase 8 — track `!important` patch removals here as they are validated.)_

- None removed yet; tokens + glass reduce reliance on patch files.

## New components

- `Sidebar.svelte` — labeled left navigation
- `SkillsConnectors.svelte` — WIP placeholder page