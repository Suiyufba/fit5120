# Plan Route Map Popup Detail Upgrade (2026-04-17)

## Background
- 需求：`Plan Route` 页面地图上风险点弹窗信息需要更详细。

## Frontend Changes
- 文件：`frontend/src/views/RoutePlanner.vue`
- 风险点弹窗由简版升级为详细版，内容包括：
  - 标题（`title`）
  - 描述（清洗后的 `description`）
  - 类型与等级（`meta.label` + severity）
  - 分类（`riskCategory`）
  - 更新时间（`updatedAt`）
  - 数据来源（`source`）
- 新增弹窗辅助函数：
  - `escapeHtml`
  - `cleanPopupDescription`
  - `formatUpdatedTime`

## API / Contract Impact
- 无接口改动，仅前端弹窗展示增强。
