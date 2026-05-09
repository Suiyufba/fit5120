---
version: alpha
name: HikeShield Design Direction
description: "A hiking-safety interface for Victoria: Airbnb warmth for trip planning, IBM clarity for risk communication, Linear precision for route-planning tools, and Apple restraint for photography-led place detail."

source_references:
  primary:
    - airbnb/DESIGN.md
  supporting:
    - ibm/DESIGN.md
    - linear.app/DESIGN.md
    - apple/DESIGN.md

principles:
  - Lead with outdoor confidence, not technical spectacle.
  - Make risk information calm, explicit, and impossible to miss.
  - Keep planning controls compact, predictable, and fast to scan.
  - Use photography and maps as the emotional surface; keep chrome quiet.
  - Avoid dark cinematic UI as the default because safety data needs daylight readability.

visual_mix:
  airbnb_warmth:
    role: "Primary consumer-facing language for Home, route discovery, location detail, and community surfaces."
    use:
      - Warm white canvas
      - Generous whitespace
      - Rounded search and route cards
      - Photography-led destination moments
      - Trail-green accent for primary journey actions
  ibm_safety_clarity:
    role: "Risk map, hazard states, scoring breakdowns, warnings, and dense factual panels."
    use:
      - Flat surfaces
      - Clear dividers
      - Strong semantic colors
      - Plain labels over decorative copy
      - Data-first layouts with no visual ambiguity
  linear_precision:
    role: "Route planner controls, authenticated utility pages, history, settings, and repeated workflows."
    use:
      - Compact panels
      - 8px radii for tool surfaces
      - Hairline borders
      - Subtle interaction states
      - Minimal icon-led controls
  apple_restraint:
    role: "Premium route detail, 3D terrain, hero imagery, and place storytelling."
    use:
      - Large clean imagery
      - Minimal overlay text
      - Crisp system typography
      - Alternating light and deep image sections only when content benefits

colors:
  primary: "#1f6e57"
  primary-hover: "#185744"
  primary-soft: "#e7f4ed"
  safety-blue: "#2e7d6b"
  safety-blue-hover: "#246a5c"
  route-indigo: "#5e6ad2"
  route-indigo-soft: "#eef0ff"
  ink: "#1f2933"
  ink-strong: "#111827"
  ink-muted: "#5f6b7a"
  ink-subtle: "#8a94a3"
  canvas: "#ffffff"
  canvas-soft: "#f7f7f7"
  surface: "#ffffff"
  surface-raised: "#fafafc"
  surface-map: "#f4f6f4"
  hairline: "#e0e4e8"
  hairline-strong: "#c8d0d8"
  semantic-safe: "#24a148"
  semantic-caution: "#f1c21b"
  semantic-danger: "#da1e28"
  semantic-info: "#2e7d6b"
  on-primary: "#ffffff"

typography:
  family:
    ui: "Inter, SF Pro Text, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    display: "Inter, SF Pro Display, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    mono: "'IBM Plex Mono', 'SF Mono', ui-monospace, monospace"
  scale:
    hero:
      fontSize: "clamp(40px, 6vw, 72px)"
      fontWeight: 650
      lineHeight: 1.04
      letterSpacing: 0
    page-title:
      fontSize: "clamp(30px, 4vw, 48px)"
      fontWeight: 650
      lineHeight: 1.12
      letterSpacing: 0
    section-title:
      fontSize: "28px"
      fontWeight: 650
      lineHeight: 1.2
      letterSpacing: 0
    card-title:
      fontSize: "18px"
      fontWeight: 650
      lineHeight: 1.25
      letterSpacing: 0
    body:
      fontSize: "16px"
      fontWeight: 400
      lineHeight: 1.55
      letterSpacing: 0
    body-sm:
      fontSize: "14px"
      fontWeight: 400
      lineHeight: 1.45
      letterSpacing: 0
    caption:
      fontSize: "12px"
      fontWeight: 500
      lineHeight: 1.35
      letterSpacing: 0

shape:
  tool-radius: "8px"
  card-radius: "14px"
  search-radius: "9999px"
  modal-radius: "16px"
  map-panel-radius: "12px"

layout:
  page-max-width: "1180px"
  content-max-width: "960px"
  section-gap: "72px"
  grid-gap: "24px"
  panel-padding: "20px"
  mobile-panel-padding: "16px"

components:
  primary_action:
    background: "{colors.primary}"
    text: "{colors.on-primary}"
    radius: "{shape.search-radius}"
    guidance: "Use for starting route planning, saving a route, submitting a report, or confirming a high-intent action."
  secondary_action:
    background: "{colors.surface}"
    text: "{colors.ink-strong}"
    border: "1px solid {colors.hairline}"
    radius: "{shape.tool-radius}"
    guidance: "Use for utility actions and low-risk choices."
  risk_banner:
    background: "semantic color at 8-12% tint"
    border: "1px solid matching semantic color"
    radius: "{shape.tool-radius}"
    guidance: "Use IBM-style direct language: status, cause, recommended action."
  route_card:
    background: "{colors.surface}"
    border: "1px solid {colors.hairline}"
    radius: "{shape.card-radius}"
    guidance: "Use Airbnb-like warmth with a clear route image/map preview, distance, time, risk, and one primary action."
  planner_panel:
    background: "{colors.surface}"
    border: "1px solid {colors.hairline}"
    radius: "{shape.tool-radius}"
    guidance: "Use Linear-style density. Controls should be grouped by workflow, not decoration."
  data_table:
    background: "{colors.surface}"
    border: "1px solid {colors.hairline}"
    radius: "{shape.tool-radius}"
    guidance: "Use IBM-style rows, labels, and semantic badges. Avoid shadows."

page_guidance:
  home:
    direction: "Airbnb-first: inviting route search, local outdoor imagery, warm primary CTA, concise safety preview."
  route_planner:
    direction: "Linear-first with IBM risk clarity: compact controls, map as the main canvas, persistent summary and safety status."
  risk_map:
    direction: "IBM-first: factual hierarchy, strong legend, clear severity colors, minimal ornament."
  route_detail:
    direction: "Apple plus IBM: large terrain/map imagery, restrained typography, risk explanation in structured panels."
  community_reports:
    direction: "Airbnb marketplace card rhythm with IBM severity labels."
  knowledge_hub:
    direction: "Apple-like reading calm with clear article categories and minimal card chrome."

do:
  - Use real place, map, terrain, or route imagery whenever possible.
  - Reserve trail green for the most important next action.
  - Reserve teal-green for system information, links, and safety explainers.
  - Use semantic colors consistently for Safe, Caution, Dangerous, and Info states.
  - Keep map overlays readable on mobile with stable panel dimensions.
  - Prefer icon buttons for map tools and compact planner actions.

dont:
  - Do not turn the whole app dark by default.
  - Do not use purple gradients as a main brand treatment.
  - Do not hide safety messages inside decorative cards.
  - Do not let hero-scale typography appear inside compact panels.
  - Do not use decorative blobs, bokeh, or generic AI-style gradients.
  - Do not make hazard cards visually compete with the map itself.
