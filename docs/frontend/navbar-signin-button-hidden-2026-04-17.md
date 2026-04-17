# Navbar Sign-In Button Hidden (2026-04-17)

## Background
- 需求：先将前端导航栏中的 `Sign In` 按钮注释/隐藏。

## Frontend Changes
- 文件：`frontend/src/components/Navbar.vue`
- 调整：账号按钮增加 `v-if="isAuthenticated"`，未登录用户不再看到 `Sign In` 按钮。
- 影响：已登录用户仍可看到并使用 `Profile/Dashboard` 入口。

## API / Contract Impact
- 无接口变更。
