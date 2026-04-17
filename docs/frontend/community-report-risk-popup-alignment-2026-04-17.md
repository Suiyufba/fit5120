# Community Report Risk Popup Alignment (2026-04-17)

## Background
- `CommunityReports` 页面中，地图风险点（实时 hazard）点击后弹框内容与 `RiskMap` 页面不一致。
- 用户要求两个页面风险点弹框保持一致，避免信息缺失和展示不统一。

## Frontend Changes
- 文件：`frontend/src/views/CommunityReports.vue`
- 风险点弹框由简版文案改为与 `RiskMap` 同结构内容：
  - 标题（`hazard.title`）
  - 描述（清洗后的 `hazard.description`）
  - 类型与风险等级（`meta.label` + severity）
  - 分类（`Category`）
  - 更新时间（`Updated`）
  - 数据来源（`Source`）
- 新增与 `RiskMap` 对齐的弹框辅助函数：
  - `escapeHtml`
  - `cleanPopupDescription`
  - `formatUpdatedTime`

## API / Contract Impact
- 无接口字段新增或变更。
- 仅前端展示层对齐，继续使用现有 hazard 数据字段（`title`, `description`, `severity`, `riskCategory/category`, `updatedAt`, `source`）。
