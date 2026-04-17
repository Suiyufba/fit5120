# Route `No-Go` Label Update To `Dangerous` (2026-04-17)

## Background
- 需求：将路线建议中的 `No-Go` 文案改为 `Dangerous`，并让对应状态标签变为更醒目的红色。

## Frontend Changes
- 文件：`frontend/src/views/RoutePlanner.vue`
  - 新增展示映射：`No-Go` -> `Dangerous`（仅展示层）。
  - 新增危险状态判断，兼容后端返回 `No-Go` 或 `Dangerous`。
  - 危险标签样式改为高对比红色（背景/文字/边框/高亮阴影）。
- 文件：`frontend/src/views/RouteDetail.vue`
  - 同步新增展示映射与危险状态判断。
  - 同步危险标签红色高亮样式。

## API / Contract Impact
- 无接口字段改动。
- 仍使用既有字段 `goNoGo`，仅前端展示文案与样式调整。
