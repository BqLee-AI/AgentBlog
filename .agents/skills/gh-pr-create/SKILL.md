---
name: gh-pr-create
description: 用于为本仓库准备、撰写和创建 GitHub PR；当实现已完成，或设计文档/契约改动需要单独提 PR 审核时使用，负责从 issue 形成有证据链的 PR 说明、提交证据、选择验证结果并推送分支。
license: Proprietary
compatibility:
  agent: "*"
metadata:
  language: zh-CN
  scope: github-pr-create
  repo: BqLee-AI/AgentBlog
---

# gh-pr-create

这个 skill 用来把已经完成的本地改动整理成可 review 的 PR，也用于把设计文档或 `@agentblog/shared` 契约改动单独提交审核。它不负责把未收敛需求直接变成实现。

## 先读什么

1. `README.md`、`docs/design/README.md`
2. 改动路径相关的设计文档（`docs/design/*.md`、`docs/design/frontend/*.md`）
3. `git status --short --untracked-files=all`
4. `git diff --stat` 和关键 diff
5. 关联 issue：`gh issue view <id> --repo BqLee-AI/AgentBlog --json title,body,labels,url,state`
6. 需要对照 PR 说明结构时再读 `references/pr-body.md`

不要把未提交、无关或用户已有脏改动混进 PR。当前工作区有无关变更时，先说明并只 stage 自己负责的文件。

## PR 前检查

创建 PR 前必须确认：

- 分支不是过期的本地 `main`，已经基于远端主线或清楚说明差异。
- PR 只围绕一个 issue 或一个明确的改动主题。
- 验证命令和结果可被写进 PR，不用“应该没问题”代替。
- 新模块、依赖、生成物或运行时边界变化有明确真源和说明。
- 后端 PR 已体现在 diff 或 PR 说明中：routes/services/repositories/middlewares/lib 分层、统一响应 `{ok,data,error}`、HttpError 抛错、Zod 校验、依赖方向铁律是否符合 `docs/design/02`。
- 涉及计费的 PR 已体现在 diff 或 PR 说明中：原子扣减（条件 UPDATE + 事务）、402 错误、流水落库、计费嵌入点（MCP 按次 / 在线 Agent 按 token）。
- 涉及鉴权的 PR 已体现在 diff 或 PR 说明中：JWT 与 API Key 两套体系分离不混用、资源归属校验在 service、`requireRole` 挂在 `authMiddleware` 之后。
- 涉及 MCP 的 PR 已体现在 diff 或 PR 说明中：工具复用 `ai/tools.ts`、`apiKeyMiddleware` 鉴权、按次计费在工具成功后扣。
- 涉及流式对话的 PR 已体现：注入 Agent systemPrompt、`onFinish` 按 token 扣费、**无 message 落库**。
- 涉及 `packages/shared` 的 PR 已体现：契约单一真相源、不重定义、前后端同步影响。
- 前端 PR 已体现在 diff 或 PR 说明中：page/feature/api/lib 分层、从 shared 引入类型、Bearer Header、token 存 sessionStorage、对话历史不写 localStorage。
- 若跳过分层拆分、注释或测试，必须有基于范围和风险的理由。
- 没有提交 secrets、真实 `.env`、`data/`（SQLite、上传文件）、缓存或构建产物。

## 仓库特有红线（PR 必查）

AgentBlog 有几条需求强约束，PR 前必须确认未违反：

- **slug 永久不可变**：更新路径不能改 slug。
- **API Key 不可逆存储**：只存 SHA-256 哈希，明文仅签发时返回一次。
- **在线对话不落库**：`/api/chat` 与 MCP 流程禁止写 message/conversation 表。
- **Credits 原子扣减**：条件 UPDATE + 事务，余额不足 402。
- **双鉴权不混用**：`/api` 走 JWT，`/mcp` 走 API Key。
- **依赖方向**：后端 `routes→services→repositories→db`，前端 `pages→features→api→lib→shared`，不反向。
- **契约单一真相源**：跨端类型/schema/枚举只在 `@agentblog/shared`。
- **不提交** `.env`、`data/`、secrets。

## PR 说明要求

PR body 要写清证据链，而不是只列改了什么（详见 `references/pr-body.md`）：

- 关联 issue / 设计文档段落。
- 为什么这样改，依据来自 issue、评论、设计文档还是验证结果。
- 为什么这样拆分，为什么新增或不新增抽象，为什么复用或不复用既有能力。
- 改动摘要，按边界组织（后端 API / 前端 / shared / 设计文档），不按文件流水账。
- 验证命令和结果。
- 未验证项、残余风险、非目标和原因。
- 跳过分层拆分、注释或某类测试时，说明判断依据。
- 对 AI review 可能关注的点提前说明：较新技术栈（Vercel AI SDK、MCP SDK、Drizzle、Hono 版本）、版本差异、非目标、为什么没有采用某个常见建议。

默认中文。技术命令、路径、label 保持原文。

## gh 命令流程

优先使用非交互式命令：

```bash
git status --short --untracked-files=all
git diff --stat
git add <only-owned-files>
git commit -m "<type>(scope): <中文摘要>"
git push -u origin <branch>
gh pr create --repo BqLee-AI/AgentBlog --base main --head <branch> --title "<title>" --body-file <file>
```

提交信息使用中文 Angular 风格，例如：

- `feat(api): 增加文章 CRUD 接口`
- `fix(credit): 修复并发扣减原子性`
- `feat(mcp): 接入 MCP Server 文章工具`
- `feat(web): 增加后台文章编辑页`
- `docs(design): 补充前端路由设计`
- `refactor(shared): 收敛错误码契约`

scope 用 `api` / `web` / `shared` / `mcp` / `credit` / `auth` / `agent` / `post` / `design` 等，按主要写入边界选。

不要用交互式 `gh pr create` 让关键信息散在提示流里。

## 创建后

创建 PR 后回读：

```bash
gh pr view <number> --repo BqLee-AI/AgentBlog --json title,url,state,reviewDecision,headRefName,baseRefName
```

返回给用户：

- PR URL
- 关联 issue / 设计文档
- 提交摘要
- 验证结果
- 已知风险或等待 review 的点

如果没有创建 PR，只准备了 PR body 或提交，也要说明停在哪一步以及原因。
