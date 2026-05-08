# Frontend Three.js Hero Motion

## Summary

The homepage hero now includes a Blender-inspired Three.js motion layer inside the existing first-screen hero. It translates the referenced dark 3D motion style into HikeShield's trail-safety context with an animated terrain ridge, floating moss/stone forms, atmospheric particles, fog, and cinematic lighting behind the existing hero copy and safety pulse panel.

## Files Changed

- `frontend/src/components/HomeHeroThreeBackdrop.vue`
  - New Vue component that owns the Three.js scene lifecycle as a background-only canvas.
  - Builds a procedural terrain mesh, floating organic objects, lighting, fog, particles, resize handling, and cleanup on unmount.
  - Respects `prefers-reduced-motion` by keeping the rendered scene but avoiding continuous motion.
- `frontend/src/views/Home.vue`
  - Imports and renders `HomeHeroThreeBackdrop` inside the existing hero media layer.
  - Keeps the existing homepage structure unchanged while lowering the static image opacity so the 3D layer reads clearly.
- `frontend/package.json`
  - Adds `three` for the WebGL scene.

## Interface Notes

No backend API changes were added. No new page section or navigation surface was added; this is a visual enhancement to the existing homepage hero only.

## Deployment Notes

This change is frontend-only. Pushing the branch to GitHub will trigger the existing Vercel deployment flow for the frontend.
