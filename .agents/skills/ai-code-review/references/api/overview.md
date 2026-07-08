# apps/api Review Overview

本文件是 `apps/api/**` 变更的 AI Code Review 索引。先用 changed files 和 diff 识别场景，再加载对应细则。

现有代码只能作为迁移背景，不是规范来源。审查新增或被修改代码时，以设计文档（`docs/design/00~14`）和后端目标分层作为边界；如果当前实现与目标边界冲突，按证据标为 finding 或 residual risk。

主要真源：

- `docs/design/02`（目录结构与分层规范、分层职责矩阵、依赖铁律）
- `docs/design/00`（四大子系统、三入口同进程、请求链路）
- `docs/design/12`（统一响应、错误码、HttpError、全局错误处理）

## 四大子系统与三入口

后端是**单进程**架构，同一个 Bun + Hono 进程同进程暴露三个路由前缀：

| 入口 | 路由前缀 | 鉴权 | 计费 | 真源 |
| --- | --- | --- | --- | --- |
| 写作端 Web API | `/api/*` | JWT（`authMiddleware`） | 不计费 | 02/04~08 |
| 在线 Agent 对话 | `/api/chat` | JWT（用户态） | 按 Token | 10 |
| MCP Server | `/mcp` | Header API Key（`apiKeyMiddleware`） | 按次 | 09 |

`modules/`（service + repository）是三个入口共用的业务层，不独立暴露 HTTP。MCP 工具和在线 Agent 工具共用 `src/ai/tools.ts`（需求 §4.6 强约束）。

## 分层职责矩阵

| 层 | 文件后缀 | 允许做 | 禁止做 |
| --- | --- | --- | --- |
| 路由层 | `*.routes.ts` | 定义路由、挂中间件、Zod 校验入参、调 service、返回 `ok(c, data)` | 直接操作数据库；写业务规则 |
| 服务层 | `*.service.ts` | 编排业务、权限校验、事务、计费、调 repository | 读 Hono Context；返回 HTTP 响应 |
| 数据层 | `*.repository.ts` | 纯 Drizzle 查询、insert/update/delete | 写业务规则；调其他 service |
| Schema | `*.schema.ts` | 定义 Zod schema 与导出类型 | 含运行时逻辑 |
| 中间件 | `middlewares/*.ts` | 解析/校验/拦截，向 `c.var` 注入上下文 | 写业务流程 |
| 库 | `lib/*.ts` | 纯函数工具（slug/hash/jwt/crypto/response/errors） | 访问数据库 |

> 📌 依赖铁律：`routes → services → repositories → db`，不得反向。service 之间可互相调用（小心循环依赖），repository 之间不得互相调用。

## 场景索引

| 场景 | 触发信号 | 核心审查问题 |
| --- | --- | --- |
| 路由层边界 | `routes/**`、新增 endpoint、`app.route` 注册 | route 是否保持 HTTP 薄层；是否把业务流程、DB 写入、计费塞进 route；是否用 `ok()` 返回统一响应 |
| 鉴权与 RBAC | `middlewares/auth.ts`、`rbac.ts`、`api-key.ts`、`requireRole`、`c.var.user` | JWT 与 API Key 两套体系是否分离不混用；资源归属校验是否在 service 而非中间件；`requireRole` 是否挂在 `authMiddleware` 之后 |
| Credits 计费 | `modules/credit/**`、`tryDeduct`/`charge`/`recharge`、`credit_log` | 扣减是否条件 UPDATE + 事务防超扣；余额不足是否抛 402 `INSUFFICIENT_CREDITS`；充值是否限 admin+；流水是否落库可审计 |
| API Key 不可逆存储 | `lib/crypto.ts`、`modules/api-key/**`、`keyHash`/`keyPrefix` | 库里是否只存 SHA-256 哈希；明文是否仅签发时返回一次；列表/详情是否泄露明文；吊销是否改 status 不删记录 |
| 文章与 slug | `modules/post/**`、`slug` 字段 | slug 一经发布是否永久不可变；`update` 路径是否忽略/拒绝 slug；多态作者归属 `author_type`/`author_id` 是否正确 |
| MCP Server | `mcp/**`、`createMcpServer`、`StreamableHTTPServerTransport` | 是否走 `apiKeyMiddleware`；5 个工具是否复用 `ai/tools.ts`；按次计费是否在工具成功后扣；鉴权/余额失败是否返回 HTTP 错误而非进入工具 |
| 在线 Agent 流式 | `ai/**`、`routes/chat.routes.ts`、`streamText` | 是否注入用户 Agent 的 systemPrompt；`onFinish` 是否按 token 扣费；**是否禁止落库 message**；预检余额/Agent 存在性是否在流前 |
| 统一响应与错误 | `lib/response.ts`、`lib/errors.ts`、`middlewares/error-handler.ts`、`app.onError` | 成功是否 `{ ok, data }`；失败是否 `{ ok:false, error:{code,message} }`；service 是否抛 `HttpError` 而非直接返回 HTTP；Zod 错误是否转 `VALIDATION_ERROR` + details |
| 数据库与迁移 | `db/**`、`drizzle/**`、`schema.ts` | 是否走 Drizzle 不写裸 SQL（迁移除外）；schema 字段是否对齐需求 7 张表；`bun:sqlite` 是否开 WAL + foreign_keys；索引是否覆盖 slug/author_id/credit_logs.user_id |
| 配置与环境 | `config/env.ts`、`.env`、`process.env` | 是否用 Zod 启动校验 env；是否禁止直接 `process.env.XXX`；secrets 是否不提交 |
| 测试 | `tests/**` | 是否覆盖关键路径（计费并发、RBAC、slug 不可变、Agent 限额、Key 不可逆、MCP 联调）；是否用真实 `app.request` |

## 选择规则

- 修改 `routes/**` 时，至少检查路由层边界和统一响应。
- 修改 `modules/credit/**` 或任何计费嵌入点（`mcp/**`、`ai/**`）时，必须追完整计费链路：预检 → 扣减 → 流水，不能只看单点。
- 修改 `modules/api-key/**` 或 `lib/crypto.ts` 时，必须检查不可逆存储红线。
- 修改 `modules/post/**` 时，必须检查 slug 不可变和多态作者归属。
- 修改 `mcp/**` 时，必须检查鉴权体系分离（不叠加 JWT）和工具复用 `ai/tools.ts`。
- 修改 `ai/**` 或 `routes/chat.routes.ts` 时，必须确认无 message 落库。
- 修改 `db/schema.ts` 时，必须对照需求 7 张表，不增删主表。

## 初始 finding 倾向

优先报告这些问题：

- route 内直接操作数据库、写业务规则或承载计费逻辑。
- service 读 Hono Context 或返回 HTTP 响应（破坏分层）。
- repository 调用其他 service 或写业务规则。
- 依赖方向反向（repository → service，或 service 直接被 repository 调）。
- 「先查后扣」式 Credits 扣减（非原子，会超扣）。
- API Key 明文入库、明文出现在列表/详情响应。
- slug 在更新路径被修改。
- `/api/chat` 或 MCP 流程出现 `db.insert(messages)` 落库。
- `/mcp` 路由叠加 JWT，或 `/api` 路由用 API Key。
- 错误响应泄露底层异常、连接串、token、secret 或 traceback。
- 直接 `process.env.XXX` 而非 `@/config/env`。
- `data/`、`.env`、secrets 被提交。

## 已知非目标（not-applicable 倾向）

避免把以下通用建议误判为 finding：

- 不引入重型 E2E（3 天工期，关键路径用接口冒烟 + MCP 联调即可，见 13）。
- 不引入 refresh token（博客非高敏感，单 access token 7d 过期足够，见 04）。
- 不用 Cookie 承载会话（选定 Bearer Header，见 04）。
- 不为 MCP 单独成 app（单进程共享工具定义，见 02）。
- 不持久化对话记录（需求强约束，见 10）。
