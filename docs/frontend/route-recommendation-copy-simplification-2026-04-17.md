# Route Recommendation 文案简化（2026-04-17）

## 需求
- 推荐文案改为更通俗的英文。
- 页面中不再出现用户难以理解的 `L1 / L2 / L3` 区域信息。

## 前端改动
- 文件：`frontend/src/views/RoutePlanner.vue`
  - 移除 `Route crosses zones: L1/L2/L3` 展示行。
- 文件：`frontend/src/views/RouteDetail.vue`
  - 移除 `Coverage zones crossed: L1/L2/L3` 展示行。
  - `Key Risk Sections` 的单条信息中移除 `zoneLabel` 展示。

## 影响范围
- 仅展示文案与字段展示调整，无接口字段变更。
