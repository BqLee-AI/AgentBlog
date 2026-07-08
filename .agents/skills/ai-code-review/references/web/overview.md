# apps/web Review Overview

本文件是 `apps/web/**` 变更的 AI Code Review 索引。先用 changed files 和 diff 识别场景，再加载对应细则。

现有代码只能作为迁移背景，不是规范来源。审查新增或被修改代码时，以前端设计文档（`docs/design/frontend/*`）和目标分层作为边界；如果当前实现与目标边界冲突，按证据标为 finding 或 residual risk。

主要真源：

- `docs/design/frontend/00`（技术选型、Vite SPA 决策、功能域划分、与后端契约边界）
- `docs/design/frontend/01`（目录结构、分层职责矩阵、依赖铁律、环境变量）
- `docs/design/02`（后端 shared 契约，前端类型来源）
- `docs/design/12`（错误码、统一响应，前端按 code 分支）

## 形态与三域

前端是 **Vite + React SPA**，单 bundle 三域（阅读/后台/对话），仅以路由 + 守卫区分：

| 域 | 路由 | 鉴权 | 对接后端 |
| --- | --- | --- | --- |
| 阅读端 | `/`、`/posts`、`/posts/:slug` | 无（公开已发布） | `GET /api/posts`、`GET /api/posts/:slug` |
| 写作后台 | `/admin/*` | JWT + 角色 | `/api/*` |
| 在线对话 | `/chat` | JWT（消耗自己 credits） | `POST /api/chat`（SSE 流式） |

## 分层职责矩阵

| 层 | 位置 | 允许做 | 禁止做 |
| --- | --- | --- | --- |
| 契约 | `@agentblog/shared` | 定义 payload 类型、共用 zod schema、错误码、枚举 | 业务逻辑、React 组件、fetch 调用 |
| 请求层 | `api/*.api.ts` / `lib/request.ts` | 纯函数：method+path+body → `Promise<data>`；注入 Bearer；解包响应 | 写 React、维护业务 state、调 hook |
| 数据 hook 层 | `features/*/use-*.ts` | 封装 useQuery/useMutation；定义 queryKey、失效、乐观更新 | 直接调 fetch；写 UI |
| 页面层 | `pages/*.page.tsx` | 组合 hook + 组件；路由参数处理；触发导航 | 直接调 api；维护可放 hook 的 state |
| 组件层 | `components/*`、`features/*` | 纯展示 / 受控交互；props 驱动 | 直接发请求（除非自包含组件如上传） |
| 横切库 | `lib/*` | 纯函数工具（request/auth-store/cn/markdown） | 含业务流程 |

> 📌 依赖铁律：`pages → features(use*) → api → lib(request) → shared`，不得反向。`features/post` 可以用 `features/tag` 的 hook（跨域允许，注意循环依赖）。`pages` 之间不互相 import 实现，只通过路由跳转。

## 场景索引

| 场景 | 触发信号 | 核心审查问题 |
| --- | --- | --- |
| 分层边界 | `pages/**`、`features/**`、`api/**` | 页面是否直接调 api；hook 是否写 UI；api 层是否含 React/state；依赖是否反向 |
| 契约单一真相源 | 任意 `import type`、`zodResolver`、错误码分支 | 类型/schema/枚举是否从 `@agentblog/shared` 引入；是否在前端重定义了已存在的契约 |
| 鉴权与 token | `lib/auth-store.ts`、`require-auth.tsx`、`require-role.tsx`、`Authorization` header | token 是否放 Bearer Header；存储是否用内存/sessionStorage（避免 localStorage）；401 是否清 token 跳登录；守卫是否在受保护路由前 |
| 请求与错误处理 | `lib/request.ts`、`api/*.api.ts` | 是否注入 Bearer；是否解包 `{ok,data,error}`（ok 取 data，否则 throw）；是否按 `error.code` 而非 message 分支；402 是否提示充值 |
| 流式对话 | `features/chat/**`、`useChat`、`/chat` | 是否用 `@ai-sdk/react` 的 `useChat`；`api` 指向 `/api/chat`；headers 带 Bearer；对话历史是否只放内存（禁止 localStorage） |
| 路由与懒加载 | `app/router.tsx`、`pages/**` | 是否用 React Router data router；后台路由是否懒加载；守卫顺序是否正确 |
| API Key 明文展示 | `features/api-key/**`、签发弹窗 | 明文是否仅签发时展示一次；是否有复制 + 保存提示；列表是否只显示 keyPrefix |
| 图片上传 | `features/**` 上传组件、`api/upload.api.ts` | 是否先 `POST /api/upload` 拿 URL 再 PATCH 到资源；是否限制大小 |
| 环境变量 | `config/env.ts`、`import.meta.env` | 是否只读 `VITE_` 前缀；是否用 zod 校验；前端是否泄露后端密钥（JWT_SECRET/OPENAI_API_KEY 绝不能出现） |
| 测试 | `test/**`、`*.test.tsx` | 是否用 Vitest + MSW；是否 mock fetch 而非真实后端 |

## 选择规则

- 修改 `pages/**` 时，检查是否直接调 api 或维护本应放 hook 的 state。
- 修改 `features/**` 时，检查 hook 是否直接调 fetch、是否定义 queryKey、失效策略。
- 修改 `api/**` 或 `lib/request.ts` 时，检查 Bearer 注入和响应解包。
- 修改鉴权相关时，检查 token 存储（sessionStorage 而非 localStorage）、401/402 处理、守卫顺序。
- 修改 `features/chat/**` 时，必须确认对话历史不写 localStorage（隐私红线）。
- 修改 `features/api-key/**` 时，检查明文仅展示一次。
- 修改 `config/env.ts` 时，检查是否泄露后端密钥。

## 初始 finding 倾向

优先报告这些问题：

- 前端重定义了已存在于 `@agentblog/shared` 的类型/schema/枚举。
- 页面层直接调 api 或 fetch；hook 层写 UI；api 层含 React/state。
- 依赖方向反向（api → hook，或 hook → page）。
- token 存 localStorage（应 sessionStorage/内存）。
- 对话历史写入 localStorage（违反不存记录）。
- 请求层不解包 `{ok,data,error}`，或按 message 而非 code 分支。
- 401 不清 token 跳登录；402 不提示充值。
- API Key 明文在列表/详情展示；签发后无保存提示。
- 前端 env 出现 `JWT_SECRET`/`OPENAI_API_KEY` 等后端密钥。
- slug 提供编辑入口（后端铁律 slug 不可变，前端不应允许改）。

## 已知非目标（not-applicable 倾向）

避免把以下通用建议误判为 finding：

- 不选 Next.js / SSR（选定 Vite SPA，Bearer Header 鉴权 + 流式对 SPA 更友好，见 frontend/00）。
- 阅读页 SEO 弱（读者主体是 Agent + 已登录用户，非刚需；如未来刚需可单独 SSG 阅读页）。
- 不引入 axios（原生 fetch + 薄封装足够，Bearer Header 非 Cookie）。
- 不用 Cookie 承载会话（与后端决策一致）。
