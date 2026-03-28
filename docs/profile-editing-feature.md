# Profile Editing Feature (2026-03-28)

## Summary

Updated the user `Profile` page so members can edit their own account details with different rules for normal and sensitive fields.

## Behavior

- Users can directly update:
  - `age`
  - `region`
- Users must answer their saved security question correctly before updating:
  - `email`
  - `password`

## Frontend Changes

- File: `frontend/src/views/Profile.vue`
  - Replaced the old read-only profile card with editable forms.
  - Added a `Basic Profile` section for direct age/region edits.
  - Added a protected `Email & Password` section that requires security-answer verification.
  - Added validation feedback, loading state, success state, and password confirmation.
- File: `frontend/src/services/authApi.js`
  - Added `updateCurrentUserProfile()`
  - Added `updateCurrentUserSensitiveProfile()`
- File: `frontend/src/services/authStore.js`
  - Added `saveProfile()`
  - Added `saveSensitiveProfile()`
  - Local auth state now refreshes immediately after a successful profile update.

## Backend Changes

- File: `backend/src/routes/authRoutes.js`
  - Added `PUT /api/auth/profile`
  - Added `PUT /api/auth/profile/sensitive`
- File: `backend/src/controllers/authController.js`
  - Added `updateProfile`
  - Added `updateSensitiveProfile`
- File: `backend/src/modules/auth/services/authService.js`
  - Added service logic for:
    - direct age/region updates
    - security-question gated email/password updates
- File: `backend/src/modules/auth/repositories/userRepository.js`
  - Added `updateOwnProfileById()`
  - Added `updateOwnCredentialsById()`

## API Contract

### PUT `/api/auth/profile`

Auth required: `Bearer <token>`

Request body:

```json
{
  "age": 28,
  "region": "Melbourne, VIC"
}
```

Response `200`:

```json
{
  "user": {
    "id": "1",
    "email": "user@example.com",
    "age": 28,
    "region": "Melbourne, VIC",
    "securityQuestion": "What is the name of your first hiking trail?",
    "experienceLevel": "intermediate",
    "assessmentScore": 80,
    "createdAt": "2026-03-28T...Z"
  }
}
```

### PUT `/api/auth/profile/sensitive`

Auth required: `Bearer <token>`

Request body:

```json
{
  "email": "new@example.com",
  "newPassword": "new-password-123",
  "securityQuestion": "What is the name of your first hiking trail?",
  "securityAnswer": "wilsons prom"
}
```

Rules:

- `securityQuestion` must match the saved question
- `securityAnswer` must match the saved answer
- `newPassword` is optional if the user is only updating email
- `email` is optional if the user is only updating password
- At least one of `email` or `newPassword` must be provided
