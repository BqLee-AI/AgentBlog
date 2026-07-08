# 共享契约 Review Overview

本文件是 `packages/shared/**` 变更的 AI Code Review 索引。`@agentblog/shared` 是前后端契约的单一真相源，它的改动影响面最大，必须最谨慎审查。

主要真源：

- `docs/design/02`（§1.1 shared 职责边界、§1.2 依赖关系）
- `docs/design/12`（错误码、统一响应结构）
- `packages/shared/package.json`（`exports` 指向 `./src/index.ts`，不编译）

## 职责边界

| 该放 `@agentblog/shared`                                                                      | 不该放                                                       |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| API 响应 payload 的 TS 类型（`Post`、`User`、`Agent`、`ApiKey`、`CreditLog`、`Paginated<T>`） | 后端内部实现（repository 返回的原始行）                      |
| 前后端共用的 Zod schema（如 `createPostSchema`、`loginSchema`）                               | 仅后端用的 DB 层 schema（Drizzle table 定义留在 `apps/api`） |
| 错误码枚举、统一响应结构常量                                                                  | 业务逻辑、数据库访问、Hono 中间件                            |
| 角色/状态等枚举（`Role`、`PostStatus`、`CreditType`）                                         | React 组件、AI/MCP 工具实现                                  |

## 依赖关系

```
apps/web ──depends on──▶ @agentblog/shared ◀──depends on── apps/api
```

- `shared` 不依赖任何其它 workspace（纯契约包，零依赖或仅 `zod`）。
- `shared` 通过 `exports: "./src/index.ts"` 直接消费 TS 源，不编译。改动会同时影响前后端类型检查。

## 场景索引

| 场景        | 触发信号                           | 核心审查问题                                                                                                        |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 类型漂移    | 新增/修改 payload 类型、enum、常量 | 后端 Drizzle schema 与前端是否都从 shared 引入；是否有人在前端重定义了已存在的类型                                  |
| Schema 分工 | 新增 Zod schema                    | 跨前后端复用的放 shared，仅后端内部用的留模块内；同一份 schema 只定义一次                                           |
| 错误码同步  | `codes.ts` 改动                    | 后端 `lib/errors.ts` 的 `HttpError` 静态工厂与 shared 错误码是否对齐；402 `INSUFFICIENT_CREDITS` 等强约束码是否齐全 |
| 破坏性变更  | 删除/重命名字段、改 enum 值        | 是否同时影响前后端；是否需要在 PR 说明里标注契约变更                                                                |
| 循环依赖    | shared 引入 apps/api 或 apps/web   | shared 必须零 workspace 依赖；出现即红线                                                                            |

## 初始 finding 倾向

优先报告这些问题：

- 前端重定义了已存在于 shared 的类型/schema/枚举（违反单一真相源铁律）。
- shared 里出现业务逻辑、DB 访问、Hono/React 耦合。
- shared 依赖了 `apps/api` 或 `apps/web`（破坏依赖方向）。
- 错误码改动未同步到后端 `HttpError` 或前端错误处理。
- 删除/重命名公开类型未在 PR 说明契约影响。
