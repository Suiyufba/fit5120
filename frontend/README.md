# 🌿 HikeShield Frontend

> 让环保知识变得有趣，让行动变得简单

一个面向澳大利亚用户的环保问答网站，通过答题赚取积分，参与线下环保活动。

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4fc08d?logo=vue.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwindcss)

## ✨ 功能特色

- **📝 每日问答** - 答题赚积分，连续学习有奖励
- **📅 活动中心** - 报名参加海滩清洁、植树等环保活动
- **🎁 积分商城** - 用积分兑换环保奖励
- **🏆 排行榜** - 与好友比拼环保知识
- **🏅 成就系统** - 解锁成就获得额外积分

## 🌏 澳洲本土化

- 本土环保知识（考拉保护、大堡礁、丛林防火）
- 按州/领地筛选活动（悉尼、墨尔本、布里斯班）
- 南半球季节适配

## 🛠️ 技术栈

- **Frontend**: Vue 3 + Vue Router
- **Styling**: CSS Variables (支持深色模式)
- **Build**: Vite
- **Deploy**: Vercel

## 📁 项目结构

```
hikeshield-frontend/
├── src/
│   ├── components/      # 组件
│   │   └── Navbar.vue   # 导航栏
│   ├── views/           # 页面
│   │   ├── Home.vue     # 首页
│   │   ├── Quiz.vue     # 问答页
│   │   ├── Events.vue   # 活动页
│   │   ├── Rewards.vue  # 积分商城
│   │   └── Profile.vue  # 个人中心
│   ├── router/          # 路由
│   ├── App.vue          # 根组件
│   ├── main.js          # 入口文件
│   └── style.css        # 全局样式
├── public/              # 静态资源
├── index.html           # HTML 模板
├── package.json         # 依赖配置
├── vite.config.js       # Vite 配置
└── DESIGN.md            # 设计文档
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🗺️ Real-time Victoria Risk Map（前端接口配置）

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 配置后端地址（默认）：

```env
VITE_HAZARD_API_BASE_URL=http://localhost:8080/api
VITE_SITE_ACCESS_PASSWORD=gkd
```

`VITE_SITE_ACCESS_PASSWORD` controls the outer site access gate. If omitted, the app defaults to `gkd`.

3. 前端会自动轮询：
- `GET /hazards/realtime`
- 支持查询参数：`bbox=west,south,east,north`、`layers=fire,flood,storm,heat`

4. 接口响应支持两种格式：
- GeoJSON `FeatureCollection`
- JSON `{ "hazards": [...] }`

## 📱 页面预览

### 首页
- 今日问答入口卡片
- 积分概览
- 热门活动推荐
- 专题问答入口

### 问答页
- 5道题/轮，答对得10积分
- 即时反馈 + 知识科普
- 结果页面展示得分

### 活动页
- 按城市/类型筛选
- 活动详情 + 报名
- 名额进度显示

### 积分商城
- 积分余额
- 可兑换奖励
- 积分流水记录

### 个人中心
- 学习统计
- 成就徽章
- 设置选项

## 🎨 设计规范

详见 [DESIGN.md](./DESIGN.md)

### 色彩
- **主色**: `#4caf50` (自然绿)
- **辅助色**: `#ff9800` (土地橙)
- **成功**: `#4caf50`
- **错误**: `#f44336`

### 字体
- Inter (英文)
- 系统默认 (中文)

## 📄 License

MIT
