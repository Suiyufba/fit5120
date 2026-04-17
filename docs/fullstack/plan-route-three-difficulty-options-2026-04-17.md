# Plan Route 三档路线选择（2026-04-17）

## 背景
- 新增能力：Route Planner 支持同时返回并展示三条路线，目标难度分别为 `Easy / Moderate / Hard`，用户在前端自由选择。

## 后端改动
- 文件：`backend/src/modules/routes/services/routePlannerService.js`
  - 新增 `toRoutePayload`，统一路线完整响应结构。
  - 新增 `pickDifficultyRouteOptions`，按目标难度挑选最多三条路线：
    - 优先命中 `Easy / Moderate / Hard`
    - 若某档缺失，用剩余路线补位，保持最多三条可选
  - 新增接口响应字段：
    - `routeOptions`: 三档可选路线（每条包含 geometry/risk/difficulty/goNoGo/explanation/keyRisks 等完整信息）
  - 保留原有 `recommendedRoute` 与 `alternatives`，兼容历史前端调用。

## 前端改动
- 文件：`frontend/src/views/RoutePlanner.vue`
  - 使用 `routeOptions` 渲染三档路线选择卡片并支持切换。
  - 地图高亮用户当前选中路线。
  - `View Route Details` 跳转时，详情页读取用户所选路线。
- 文件：`frontend/src/services/routeApi.js`
  - 增加 `routeOptions` 归一化处理。

## 接口影响
- `POST /api/routes/plan` 新增 `routeOptions` 字段（向后兼容，非破坏性变更）。
