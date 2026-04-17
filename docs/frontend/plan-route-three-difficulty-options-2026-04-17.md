# Plan Route 三档路线可选（2026-04-17）

## 背景
- 需求：`Plan Route` 页面一次展示三条路线，分别对应 `简单 / 中等 / 困难`，用户可自由选择。

## 前端改动
- 文件：`frontend/src/views/RoutePlanner.vue`
  - 新增三档路线卡片（简单/中等/困难）展示。
  - 支持点击卡片切换当前选中路线。
  - 地图路线绘制改为三条同屏，选中路线高亮、未选中路线虚线弱化。
  - 右侧总结面板改为显示“当前选中路线”的距离、时长、难度、风险和说明。
  - 进入 `Route Detail` 时，将当前选中路线写入 `recommendedRoute`，确保详情页与用户选择一致。
- 文件：`frontend/src/services/routeApi.js`
  - 新增 `routeOptions` 解析，优先消费后端返回的三档路线选项。

## 兼容性
- 若后端暂未返回 `routeOptions`，前端会从 `recommendedRoute + alternatives` 自动回退生成最多三条路线。
