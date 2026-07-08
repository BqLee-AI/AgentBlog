# mcp/ —— MCP Server

详见 docs/design/09。系统作为 MCP Server 暴露文章 CRUD 工具，
Header `X-API-Key` 鉴权（**与 JWT 完全分离的两套体系**，见 09 §1.1），按次计费。

挂在 Hono 的 `/mcp` 路由，与 `/api` 同进程（单进程架构）。

| 文件 | 职责 |
|------|------|
| `server.ts` | MCP 实例 + 工具注册（复用 `ai/tools.ts` 定义） |
| `handler.ts` | 挂到 `/mcp`（叠加 apiKeyMiddleware + 计费中间件） |

> 待任务 15 实现。
