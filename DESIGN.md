# HikeShield Design System

A nature-inspired design language for the Victorian hiking safety platform. Built on
warm earth tones, editorial serif headings, and glass-morphism panels — evoking the
calm competence of a well-prepared trail companion.

## Design Philosophy

HikeShield's visual identity draws from the Victorian landscape: deep forest greens,
warm parchment backgrounds, and moss-tinted accents. The aesthetic prioritises
**clarity under outdoor conditions** — high contrast for sunlit screens, generous
touch targets for gloved hands, and a map-first layout that treats cartography as the
primary interface.

Three principles guide every design decision:

1. **Map is the interface** — Hazard overlays and route geometry carry the information
   load; UI chrome steps back.
2. **Editorial confidence** — Fraunces serif headings and IBM Plex Sans body text
   create a "field guide" typographic voice that feels authored, not generated.
3. **Warm minimalism** — Glass panels, soft shadows, and restrained color keep the
   interface calm when the data (bushfire alerts, flood zones) is not.

## Color Palette

All colors are exposed as CSS custom properties in `frontend/src/style.css` under the
`--hs-*` (HikeShield) namespace.

### Core Tokens

| Token | Value | Swatch | Role |
|-------|-------|--------|------|
| `--hs-ink` | `#132b23` | ██████ | Primary text — near-black with green undertone |
| `--hs-ink-soft` | `#405a51` | ██████ | Secondary text, descriptions, metadata |
| `--hs-forest` | `#21483b` | ██████ | Brand accent, active nav, primary buttons |
| `--hs-forest-2` | `#386653` | ██████ | Hover states, pressed buttons |
| `--hs-moss` | `#8fae83` | ██████ | Highlight overlays, decorative accents |
| `--hs-cream` | `#f7f2e9` | ██████ | Warm page background |
| `--hs-paper` | `#fffaf2` | ██████ | Card and panel surfaces |
| `--hs-sage` | `#e7eee4` | ██████ | Section backgrounds, muted containers |
| `--hs-line` | `rgba(33,72,59,0.14)` | — | Borders, dividers |

### Semantic Usage

```
Page background    → --hs-cream with radial moss gradient
Card / panel       → --hs-paper at 90% opacity + glass blur
Primary button     → linear-gradient(135deg, #173b31 → #2f604e → #7f9b75)
Secondary button   → --hs-paper with border, --hs-forest text
Active nav pill    → solid #173b31, --hs-paper text
Inactive nav pill  → rgba(255,255,255,0.52) background, --hs-ink-soft text
Footer             → dark green gradient over hero image
```

### Severity Colors

Used for hazard severity badges and zone overlays on maps:

| Severity | Badge | Map Overlay |
|----------|-------|-------------|
| Extreme | Red-filled pill, white text | Concentric red circles, high opacity |
| High | Orange-filled pill, white text | Concentric orange circles |
| Moderate | Yellow-filled pill, dark text | Yellow circles, medium opacity |
| Low | Emerald-filled pill, dark text | Green circles, low opacity |

## Typography

### Font Stack

| Role | Family | Weights | OpenType Features |
|------|--------|---------|-------------------|
| Headings (h1–h3) | Fraunces (variable) | 500–700 | `opsz` 48, `SOFT` 50 |
| Body, UI, buttons | IBM Plex Sans | 400–800 | `ss01`, `cv11` |
| Icons | Material Symbols Outlined | 400 | `FILL` 0/1, `opsz` 24 |

### Type Scale

| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| Hero heading | Fraunces | clamp(3.1rem, 6.8vw, 6.55rem) | 600 | 1.04 | −0.035em |
| Section heading | Fraunces | 2rem–2.4rem | 600 | 1.12 | −0.012em |
| Card heading | Fraunces | 1.25rem–1.5rem | 600 | 1.12 | −0.012em |
| Body large | IBM Plex Sans | 1rem–1.18rem | 400 | 1.7 | normal |
| Body | IBM Plex Sans | 0.9rem–1rem | 400–500 | 1.55 | normal |
| UI label | IBM Plex Sans | 0.84rem–0.86rem | 700–800 | 1 | normal |
| Caption / meta | IBM Plex Sans | 0.72rem–0.78rem | 600–800 | 1 | +0.04em–0.22em |
| Kicker (eyebrow) | IBM Plex Sans | 0.72rem | 600 | 1 | +0.22em, uppercase |

### Typographic Rules

- **Never use pure black** — `--hs-ink` (#132b23) is the darkest color on screen.
- **Fraunces headings always use** `font-variation-settings: "opsz" 48, "SOFT" 50`
  for the warm, rounded serif character.
- **Kicker labels** (`.u-kicker`) have a leading short rule line created via
  `::before` pseudo-element — never use a separate `<hr>` or icon.
- **Hand-painted highlights** (`.u-highlight`) use a bottom-aligned linear-gradient
  stripe rather than `text-decoration: underline` or colored text — this is an
  authored accent, not a link indicator.

## Elevation & Surfaces

### Shadow Scale

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| Soft | `--hs-shadow-soft` | `0 16px 44px rgba(27,55,44,0.1)` | Cards, panels |
| Default | `--hs-shadow` | `0 24px 70px rgba(27,55,44,0.14)` | Elevated panels, map overlays |
| Nav | — | `0 12px 36px rgba(25,56,45,0.08)` | Sticky navigation bar |

### Surface Types

```
.hs-card          → border, rounded-xl, --hs-paper bg, --hs-shadow-soft
.hs-glass         → border, backdrop-blur(18px), --hs-paper at 76% opacity
.hs-button-primary → pill gradient, 0 16px 36px shadow, hover lift
.hs-button-secondary → pill outline, white bg, hover fill
```

### Glass Morphism

Key panels use backdrop blur for depth:
- **Navbar**: `backdrop-blur(22px)`, `rgba(255,250,242,0.82)` background
- **Hero stat panel**: `backdrop-blur(18px)`, `rgba(255,250,242,0.82)` with white border
- **Site access gate**: `backdrop-blur(18px)`, `rgba(255,250,242,0.94)` panel

## Component Patterns

### Navigation

- **Desktop**: Horizontal pill row inside a rounded-full container. Active item is
  solid dark green with white text and a drop shadow. Inactive items are transparent
  with muted text.
- **Mobile**: Hamburger-triggered dropdown with full-width pill links. Active state
  matches desktop.
- **Brand lockup**: Logo mark (2.45rem) + Fraunces wordmark + uppercase subline
  ("Victoria trail safety").

### Buttons

```
Primary:   pill shape, dark-green gradient, white text, 16px shadow, hover lift
Secondary: pill shape, white bg with green border, green text, hover fills to white
Account:   pill shape, white bg with border, icon + label, ellipsis overflow
Menu:      circular (2.65rem), white bg, icon-only, hidden on desktop
```

### Cards

- White background with 1px `--hs-line` border
- `border-radius: 1rem` (`.hs-card`) or `1.25rem` (panels)
- Soft shadow (`--hs-shadow-soft`)
- Optional glass variant with backdrop blur

### Hazard Badges

- `font-size: 10px`, `font-weight: bold`, uppercase
- Fully rounded pills (`border-radius: 999px`)
- Color-coded by severity (see Severity Colors above)
- Used in: home preview, risk map popups, community report cards, route detail

### Map Overlays

- **Hazard zones**: Concentric circles at 1 km / 3 km / 5 km radii around each hazard
  point. Opacity scales with severity.
- **Route geometry**: Polylines rendered on Leaflet or Mapbox GL JS. Color varies by
  risk level.
- **Preview map (home)**: Leaflet with Positron tiles, constrained to Victoria bounds.
  Bottom overlay card with top-4 hazard list.

## Mobile Patterns

### Bottom Sheet

On screens ≤980px, map-page views use a mobile bottom sheet:

- **Peek state**: Sheet sits at bottom with ~220px visible. Shows summary info.
- **Expanded state**: Slides up to 76dvh. Full content with scroll.
- **Handle**: Centered drag indicator (3.1rem × 0.32rem, 20% opacity).
- **Transition**: `transform 0.28s ease` with shadow change.

Implementation class: `.mobile-sheet` with `.mobile-sheet--expanded` modifier.

### Touch Targets

- All interactive elements ≥ 44px minimum height
- At ≤700px, form elements bump to 16px `font-size` (prevents iOS zoom)
- `-webkit-tap-highlight-color: transparent` on all interactive elements

## Layout

### Page Shell

```css
.hs-shell {
  width: min(1180px, calc(100% - 2rem));
  margin-inline: auto;
}
```

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | ≤640px | Compact brand, hidden subline, stacked hero |
| Tablet | ≤820px | Footer collapses to single column |
| Nav collapse | ≤980px | Desktop nav → hamburger, bottom sheets activate |
| Desktop | >980px | Full horizontal nav, side panels on maps |

### Grid Patterns

- **Home hero**: 2-column (copy + stat panel), collapses to single column ≤900px
- **Hazard bento**: 8-col map + 4-col sidebar on desktop, stacks on mobile
- **Community alerts**: 3-column card grid, collapses to 1 column
- **Footer**: 3-column link grid + brand column, collapses to 2+1 then 1

## Iconography

Uses **Material Symbols Outlined** via Google Fonts CDN:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
```

- Default style: `FILL` 0, `wght` 400, `GRAD` 0, `opsz` 24
- Filled variants: use `font-variation-settings: 'FILL' 1` inline for emphasis
  (e.g., hazard type icons in the sidebar)

## Photography

Hero and card images source from Unsplash:
- Hero: Victorian bush trail (golden light, forest path)
- Knowledge Hub cards: Article-specific images from database
- Fallback: Radial green gradient when no image is available

## Do's and Don'ts

### Do

- Use `--hs-*` tokens for all colors — never hardcode hex values
- Use Fraunces for h1–h3 with `font-variation-settings: "opsz" 48, "SOFT" 50`
- Use `.u-kicker` for section eyebrow labels with the built-in rule line
- Use `.hs-button-primary` / `.hs-button-secondary` for consistent button styling
- Keep map views scoped to Victoria's bounding box
- Use the mobile sheet pattern for map-page secondary content on small screens

### Don't

- Don't use pure black (`#000`) or pure white (`#fff`) — always use HS tokens
- Don't apply the Airbnb `--palette-*` or Rausch Red tokens — they belong to a
  deprecated design exploration, not the current system
- Don't use `text-decoration: underline` for highlights — use `.u-highlight`
- Don't use system fonts directly — the body stack is IBM Plex Sans
- Don't add new brand colors beyond the forest → moss → cream spectrum
- Don't use Material Icons (filled) as the default — use Outlined with `FILL` 0
