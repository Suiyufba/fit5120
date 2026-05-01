# Route Planner Result Display Cleanup - 2026-05-01

## Summary

Updated the Plan Route page result presentation to match the simplified UI copy.

## Changes

- `frontend/src/views/RoutePlanner.vue`
  - Displays `Plan Safe Route` and `Reset Points` on one row.
  - Shows risk labels only, such as `Low`, without numeric risk scores in route cards, summary, or history rows.
  - Displays successful route status as `Safe` instead of `Go`.

## Notes

This is a frontend-only display change. Route scoring, selected route data, and backend API payloads are unchanged.
