# Frontend Three.js Motion Showcase

## Summary

The homepage now includes a Blender-inspired Three.js motion panel directly after the hero section. It translates the referenced dark, rounded 3D homepage banner style into HikeShield's trail-safety context with an animated terrain ridge, floating moss/stone forms, atmospheric particles, and a call-to-action into the route planner.

## Files Changed

- `frontend/src/components/TrailMotionShowcase.vue`
  - New Vue component that owns the Three.js scene lifecycle.
  - Builds a procedural terrain mesh, floating organic objects, lighting, fog, particles, pointer parallax, resize handling, and cleanup on unmount.
  - Respects `prefers-reduced-motion` by keeping the rendered scene but avoiding continuous motion.
- `frontend/src/views/Home.vue`
  - Imports and renders `TrailMotionShowcase` after the existing homepage hero.
- `frontend/package.json`
  - Adds `three` for the WebGL scene.

## Interface Notes

No backend API changes were added. The only user-facing navigation added is the showcase call-to-action, which routes to the existing `/route-planner` page.

## Deployment Notes

This change is frontend-only. Pushing the branch to GitHub will trigger the existing Vercel deployment flow for the frontend.
