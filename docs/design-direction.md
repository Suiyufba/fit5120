# HikeShield Design Direction

This project uses a blended design direction documented in the root `DESIGN.md`.

## Selected References

- **Airbnb** is the primary influence for the consumer-facing hiking experience: warm white surfaces, photography-led route discovery, rounded search patterns, and approachable calls to action.
- **IBM** guides risk, hazard, and safety communication: flat data surfaces, clear dividers, semantic severity colors, and direct status language.
- **Linear** guides planning and account utility workflows: compact panels, precise controls, subtle borders, and efficient scanning.
- **Apple** guides premium route detail and place presentation: restrained typography, large imagery, and quiet UI chrome.

## Product Fit

HikeShield is a Victorian hiking safety platform, so the interface should feel welcoming enough for trip planning while keeping hazard and route-risk information explicit. The default experience should stay light and readable; dark cinematic styling is reserved only for image-led moments where it does not reduce safety clarity.

## Implementation Notes

- Use `DESIGN.md` before making UI changes.
- Keep original reference files in `airbnb/`, `apple/`, `ibm/`, and `linear.app/`.
- Treat coral as the main journey action color and reserve blue/semantic colors for system and safety information.
- Prefer stable, compact map and planner controls over decorative layout elements.
