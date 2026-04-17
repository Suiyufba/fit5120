# RiskMap & Plan Route Risk Counting Alignment (2026-04-17)

## Background
- 问题：`RiskMap` 与 `Plan Route` 地图展示的风险数量不一致。
- 原因：两页存在统计口径差异（时间窗/风险等级过滤、定位初始化行为、刷新触发策略不同）。

## Frontend Changes
- 文件：`frontend/src/views/RiskMap.vue`
- 与 `Plan Route` 对齐的调整：
  - 风险数据请求层统一为固定 layers：`fire,flood,storm,heat,trail,other`。
  - 保持按当前地图 bbox 拉取风险数据。
  - 增加 `moveend` 触发刷新（与 Plan Route 一致），并保留 60s 定时刷新。
  - 移除用户定位后自动重设视角逻辑，避免初始 bbox 与 Plan Route 不同。
  - 移除时间窗与风险等级对地图计数/绘制的影响，风险数量改为与 Plan Route 同口径。
  - 侧边栏筛选控件调整为静态图层说明，避免“显示可筛选但计数口径不同”的误导。

## API / Contract Impact
- 无接口变更。
- 仅前端统计和展示逻辑对齐。
