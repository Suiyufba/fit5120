# Remove `other` Layer and Subcategories From All Maps (2026-04-17)

## Background
- 需求：删除各页面地图中的 `other` 分类及其子类展示，统一风险图层口径。

## Frontend Changes
- 已在所有地图相关页面移除 `other` 风险图层请求与展示：
  - `frontend/src/views/RiskMap.vue`
  - `frontend/src/views/RoutePlanner.vue`
  - `frontend/src/views/RouteDetail.vue`
  - `frontend/src/views/CommunityReports.vue`
  - `frontend/src/views/Home.vue`
  - `frontend/src/components/HomeRiskPreviewMap.vue`
  - `frontend/src/views/AdminDashboard.vue`
  - `frontend/src/views/LocationDetail.vue`

- 统一调整内容：
  - `fetchRealtimeHazards` 的 `layers` 参数去除 `other`
  - 地图图例/筛选中的 `Other` 及其子类标签删除
  - 历史/异常 `other` 类型数据在地图展示侧统一回退为 `trail` 视觉样式，避免出现 `Other` 标签
  - 社区上报与后台手动地图实体类型下拉中移除 `Other` 选项

## API / Contract Impact
- 无后端接口字段变更。
- 仅前端地图展示口径变更（不再请求和展示 `other` 图层）。
