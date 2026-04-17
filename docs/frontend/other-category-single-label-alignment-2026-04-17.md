# `Other` Category Single-Label Alignment (2026-04-17)

## Background
- 调整目标：保留地图中的 `Other` 主分类，但不再显示 `Other` 的细分子类。

## Frontend Changes
- 地图请求层恢复 `other`：
  - `RiskMap`, `RoutePlanner`, `RouteDetail`, `CommunityReports`, `Home`, `AdminDashboard`
- 地图展示规则统一：
  - 当 `hazard.type === "other"` 时，分类文本统一显示 `Other`
  - 不再根据 `riskCategory` 展示 `Other` 子分类名称
- 相关页面恢复 `Other` 主类可见性：
  - 图层元数据与图例中的 `Other`
  - 社区上报与后台实体类型下拉中的 `Other`
  - Location Detail 中 `other` 类型兜底

## API / Contract Impact
- 无接口变更。
- 仅前端展示与筛选口径调整。
