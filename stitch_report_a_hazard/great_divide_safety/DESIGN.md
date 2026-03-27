# Design System Documentation: The Topographic Guardian

## 1. Overview & Creative North Star
This design system is built to transcend the standard "utility app" aesthetic, moving into the realm of **High-End Editorial Safety**. In the context of Victorian hiking—where the environment ranges from the lush Dandenongs to the rugged Grampians—the UI must feel as reliable as a compass and as sophisticated as a modern travel journal.

### Creative North Star: "The Organic Cartographer"
We reject the rigid, boxed-in layouts of traditional safety apps. Instead, we embrace **The Organic Cartographer**: a design language characterized by intentional asymmetry, layered depth, and a "living" map aesthetic. We use high-contrast typography scales and overlapping elements to mimic the way a hiker interacts with physical maps and the natural terrain. The interface shouldn't just present data; it should curate an experience of safety and discovery.

---

## 2. Colors & Surface Philosophy
Our palette is rooted in the Victorian landscape: the muted silver-greens of the Eucalyptus and the deep charcoals of alpine slate.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined through **Background Tonal Shifts**. For example, a `surface-container-low` section should sit directly against a `surface` background. If you feel the need for a line, you have failed to use your spacing or color tokens effectively.

### Surface Hierarchy & Nesting
We treat the UI as a physical stack of semi-translucent materials. 
- **Nesting:** Use `surface-container-lowest` to `surface-container-highest` to create a "nested" hierarchy. 
- **Layering:** A primary map layer sits at the base, with `surface-container-low` informational panels appearing to "float" or "rest" upon it.

### The "Glass & Gradient" Rule
To evoke the shifting Victorian weather, use **Glassmorphism** for floating map overlays and navigation bars.
- Use semi-transparent `surface` colors with a `backdrop-blur` of 12px–20px.
- **Signature Textures:** Apply a subtle linear gradient (from `primary` #334f2b to `primary-container` #4a6741) on hero CTAs to provide a sense of "soul" and organic depth that flat hex codes lack.

---

## 3. Typography
We pair the geometric authority of **Manrope** for displays with the hyper-legible utility of **Inter** for data-heavy safety information.

- **Display & Headlines (Manrope):** These are our "Editorial" anchors. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create a bold, trustworthy presence.
- **Titles & Body (Inter):** These are our "Functional" anchors. Inter’s tall x-height ensures readability during high-exertion hiking or low-light conditions.
- **Labeling:** Use `label-md` (0.75rem) in all-caps with increased letter-spacing (0.05em) for category headers to create a premium, "mapped" feel.

---

## 4. Elevation & Depth
Traditional drop shadows are too "digital." We use **Tonal Layering** and **Ambient Light** to convey importance.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, natural "lift" that mimics fine paper on a desk.
- **Ambient Shadows:** For floating elements (e.g., "Start Hike" button), use extra-diffused shadows. 
    - *Settings:* Y: 8px, Blur: 24px, Color: `on-surface` at 6% opacity. This mimics natural light, not a computer-generated effect.
- **The Ghost Border Fallback:** If accessibility requires a stroke (e.g., input fields), use `outline-variant` at **20% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons
- **Primary:** Rounded `md` (0.75rem/12px). Background: `primary` gradient. Text: `on-primary`. 
- **Secondary:** Surface-only with a `Ghost Border`. 
- **Interaction:** On hover, shift the gradient intensity rather than changing the base color.

### Safety Hazard Chips
- **Design:** Forbid the use of heavy, solid-colored boxes. 
- **Execution:** Use a high-chroma text color (e.g., `Bushfire Red` #E76F51) on a soft `surface-variant` background. Add a 4px "status dot" next to the text to indicate severity without overwhelming the user visually.

### Layered Map Cards
- **Structure:** No dividers. Use `spacing-6` (1.5rem) to separate the map preview from the hike metadata.
- **Depth:** The map should feel "recessed." Use a subtle inner shadow or a slightly darker `surface-dim` container to make the map feel like a window into the world.

### Input Fields
- **Styling:** Use `surface-container-high` as the fill. 
- **States:** On focus, the container should shift to `surface-container-highest` with a 2px `primary` bottom-bar only. This maintains the "No-Line" rule while providing clear feedback.

---

## 6. Do’s and Don’ts

### Do:
- **Use Asymmetry:** Place a `headline-lg` off-center to create an editorial, high-end feel.
- **Embrace White Space:** Use `spacing-12` (3rem) and `spacing-16` (4rem) liberally to let the content breathe. Safety information shouldn't feel claustrophobic.
- **Use "Tinted" Neutrals:** Ensure all grays are tinted with our `Earthy Muted Brown` or `Dark Slate` to avoid a sterile, "default" look.

### Don’t:
- **No 1px Dividers:** Never use a horizontal line to separate list items. Use a `surface` shift or `spacing-4` gaps.
- **No Harsh Shadows:** Avoid the standard `0px 2px 4px rgba(0,0,0,0.5)` shadow. It looks cheap and dated.
- **No Pure Black:** Text should always be `on-surface` (#001f29) to maintain the soft, natural palette of the Victorian bush.