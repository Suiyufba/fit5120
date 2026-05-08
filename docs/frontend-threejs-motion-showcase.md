# Frontend Hero Background Resource

## Summary

The homepage hero now uses a high-quality existing Pexels mountain background instead of the custom procedural Three.js scene. This keeps the first-screen structure unchanged while avoiding low-quality generated 3D geometry.

## Files Changed

- `frontend/src/views/Home.vue`
  - Replaces the hero image with a Pexels CDN resource:
    `https://images.pexels.com/photos/34724001/pexels-photo-34724001.jpeg?auto=compress&cs=tinysrgb&w=2400`
  - Keeps the existing homepage structure unchanged.
  - Tunes the dark overlay for text and panel contrast.
- `frontend/package.json`
  - Removes `three` because the homepage no longer uses the procedural WebGL background.

## Interface Notes

No backend API changes were added. No new page section or navigation surface was added; this is a visual replacement for the existing homepage hero background only.

## Deployment Notes

This change is frontend-only. Pushing the branch to GitHub will trigger the existing Vercel deployment flow for the frontend.
