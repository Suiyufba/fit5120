# Community Report Mobile Camera Photo (2026-05-04)

## Summary

- Removed the photo upload hint text:
  - `We resize your image to a small thumbnail before upload — no full-size photos leave your device.`
- Updated the optional photo attachment input so mobile browsers can open the device camera.

## Frontend Change

- Page: `frontend/src/views/CommunityReports.vue`
- Input now uses:

```html
accept="image/*"
capture="environment"
```

This keeps desktop file selection available while prompting compatible mobile browsers to use the rear camera for taking a report photo.

## Notes

- Existing thumbnail generation and upload behavior is unchanged.
- No backend API change was required.
