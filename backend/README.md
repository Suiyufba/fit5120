# goHiking Backend (Railway-ready)

后端已提供前端所需最小可用接口：
- `GET /api/hazards/realtime?bbox=west,south,east,north&layers=fire,flood,storm,heat`
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset/security`
- `GET /api/auth/me`

## 项目分层（按功能）

```text
src/
├── config/                      # 环境变量与全局配置
├── controllers/                 # HTTP 控制器
├── routes/                      # API 路由注册
├── modules/
│   └── hazards/
│       ├── adapters/            # 上游数据源适配器
│       ├── data/                # fallback 数据
│       ├── domain/              # hazard 领域工具
│       └── services/            # 聚合/缓存调度服务
├── infrastructure/
│   └── cache/                   # 缓存实现（memory/redis）
├── shared/
│   └── http/                    # 通用 HTTP 工具
└── server.js                    # 应用入口
```

## 1) 本地启动

```bash
npm install
cp .env.example .env
npm run dev
```

默认地址：`http://localhost:8080/api/hazards/realtime`

## 2) 返回结构（已对齐前端）

```json
{
  "hazards": [
    {
      "id": "evt-123",
      "type": "fire",
      "severity": "high",
      "title": "Smoke near Apollo Bay",
      "description": "...",
      "source": "VicEmergency",
      "sourceUrl": "https://...",
      "updatedAt": "2026-03-27T12:00:00Z",
      "coordinates": [-38.75, 143.66]
    }
  ],
  "fetchedAt": "2026-03-27T12:00:00Z",
  "fromFallback": false,
  "meta": {
    "count": 1,
    "totalBeforeFilter": 10,
    "sourceStatus": [
      { "name": "DataVic Road Disruptions", "ok": true, "count": 4, "error": null }
    ],
    "lastError": null
  }
}
```

`severity` 枚举：`extreme | high | moderate | low`

## 3) 缓存和轮询策略

- 定时抓取上游：`FETCH_INTERVAL_MS`（默认 2 小时）
- API 返回快照，不会每次请求都直连上游
- 若配置 `DATABASE_URL`，快照会持久化到 Postgres，仅存一条最新数据（无历史）
- 默认内存缓存；配置 `REDIS_URL` 后自动切 Redis（适合 Railway 多实例）
- 上游异常时不会回退示例数据，直接返回空列表并标记 `lastError`

## 4) Railway 部署

### 4.1 新建服务

1. Railway -> `New Project` -> `Deploy from GitHub Repo`
2. 选择本仓库 `hiking_backEnd`
3. Railway 会自动识别 Node 项目并执行：
   - Build: `npm install`
   - Start: `npm start`

### 4.2 Railway 环境变量

至少配置以下变量：

- `PORT=8080`（Railway 也会自动注入，保留即可）
- `CORS_ORIGIN=https://你的前端域名`
- `FETCH_INTERVAL_MS=7200000`
- `REQUEST_TIMEOUT_MS=10000`
- `STALE_THRESHOLD_MS=600000`
- `DEFAULT_LAYERS=fire,flood,storm,heat`
- `DATABASE_URL=<Railway Postgres URL>`
- `DATABASE_SSL=true`
- `AUTH_JWT_SECRET=<strong-random-secret>`
- `AUTH_JWT_EXPIRES_IN=7d`

可选（建议逐步接入官方源）：

- `VICROADS_API_URL=...`（DataVic Unplanned Disruption API）
- `VICROADS_API_KEY=...`（Transport Victoria Open Data Portal 账号生成）
- `OPENWEATHER_API_KEY=...`（OpenWeather API Key）
- `OPENWEATHER_API_URL=https://api.openweathermap.org/data/2.5/weather`
- `VIC_EMERGENCY_FEED_URL=...`（你申请/确认可用的 VicEmergency feed）
- `VIC_EMERGENCY_API_KEY=...`（如果源要求鉴权）
- `REDIS_URL=...`（若绑定 Railway Redis 插件）
- `REDIS_TTL_SECONDS=90`

### 4.3 对外地址

部署后你会得到：
`https://<railway-domain>/api/hazards/realtime`

## 5) 前端配置

前端 `.env`：

```env
VITE_HAZARD_API_BASE_URL=https://<railway-domain>/api
```

你现有前端会自动请求：
- `/hazards/realtime`
- 支持 `bbox` 与 `layers`
- 60 秒轮询（已在前端实现）

## 6) 当前已接的 API 能力

- 聚合接口：`GET /api/hazards/realtime`
- 查询参数：
  - `bbox=west,south,east,north`
  - `layers=fire,flood,storm,heat`
- 数据源适配器：
  - DataVic（默认 URL 已给）
  - BoM（留可配置入口）
  - VicEmergency（留可配置入口）

## 7) 后续可加（你前端已兼容）

- 增加 `SSE / WebSocket` 推送
- 扩展 GeoJSON 原样返回模式
- 增加上游健康检查和告警（例如 `/api/health/providers`）

## 8) 用户认证接口

`POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "age": 24,
  "region": "Melbourne, VIC",
  "assessmentAnswers": {
    "q_weather": "b",
    "q_injury": "a",
    "q_lost": "a",
    "q_fire": "b"
  }
}
```

`POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

`GET /api/auth/me`

Header: `Authorization: Bearer <token>`

`POST /api/auth/password-reset/security`

```json
{
  "email": "user@example.com",
  "securityQuestion": "What is your favorite outdoor activity?",
  "securityAnswer": "hiking",
  "newPassword": "newPassword123"
}
```
