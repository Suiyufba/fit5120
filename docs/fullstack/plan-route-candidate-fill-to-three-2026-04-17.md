# Plan Route 候选路线补足到三条（2026-04-17）

## 背景
- 为了支持前端 `Easy / Moderate / Hard` 三档可选，后端在部分起终点场景下需要尽量补齐候选路线数量。

## 后端调整
- 文件：`backend/src/modules/routes/services/routePlannerService.js`
- 逻辑：
  - 原先仅在候选路线 `< 2` 时才补 detour 路线。
  - 现在改为候选路线 `< 3` 时补 detour 路线，提升三条可选路线可用率。

## 影响
- 接口字段不变（兼容）。
- 提升 `routeOptions` 生成三条不同候选路线的概率。
