# middlewares/ —— 横切关注点

详见 docs/design/02 §二。随业务推进逐步实现：

| 文件 | 职责 | 对应文档 |
|------|------|----------|
| `auth.ts` | 解析 JWT → 注入 `c.var.user` | 04 |
| `rbac.ts` | `requireRole(...)` 角色校验 | 05 |
| `api-key.ts` | MCP Header `X-API-Key` 鉴权 → `c.var.apiKeyUser` | 09 |
| `error-handler.ts` | 全局错误捕获（`app.onError`） | 12 |
| `request-id.ts` | 注入 `X-Request-Id` | 12 |
| `logger.ts` | 请求日志（临时用 `hono/logger`） | — |
