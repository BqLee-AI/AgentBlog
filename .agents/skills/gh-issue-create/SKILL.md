---
name: gh-issue-create
description: 用于为本仓库创建、拆分、补写或批量整理 GitHub 开发 issue；当讨论、设计差距、PR 评论或用户粗略需求需要先被压成可协作 issue 时使用，输出 why now、范围、非目标、未决点、验收、验证和分层风险。
license: Proprietary
compatibility:
  agent: "*"
metadata:
  language: zh-CN
  scope: github-issues
  repo: BqLee-AI/AgentBlog
---

# gh-issue-create

这个 skill 只负责把工作收敛成 AgentBlog 仓库可接手的 GitHub issue。它不是用户反馈模板，也不负责直接实现。

目标是把同一个问题从 discussion / 口头需求 / 设计差距，压成后续 PR 能继续接住的协作对象。不要为了“信息完整”堆材料；要把判断写到正确位置。

## 先读什么

只读当前 issue 需要的上下文，避免批量扫仓库：

1. `README.md`、`docs/design/README.md`（文档导航）
2. 相关 `docs/design/*.md`（后端 00~14）；设计文档是长期真相层
3. 相关 `docs/design/frontend/*.md`；前端设计文档是前端真相层
4. 已有相关 GitHub issue 或 PR：`gh issue view <id> --repo BqLee-AI/AgentBlog --json title,body,labels,url,state`
5. 用户提到的 PR 评论、review finding 或失败日志
6. 需要对照原则时再读 `references/issue-guidelines.md`
7. 需要同步或选择标签时再读 `references/label-policy.md`

## 核心判断

一个开发 issue 必须收住一个可验证的不确定性，而不是功能篮子或施工流水账。创建前先确认：

- 单一问题：这一刀到底解决哪个缺口？
- 为什么现在做：它正在阻塞哪个设计、实现、验证或后续 issue？
- 范围边界：哪些内容明确不进本轮？
- 验收口径：什么算成立，什么明确不成立，什么是失败信号？
- 分层/边界风险：是否涉及 routes/services/repositories 边界、shared 契约、计费、鉴权、多态作者归属、MCP 工具或前端 page/feature/api 分层？

如果这些问题还答不清，不要硬造 `status:ready` issue。先问用户一个聚焦问题，或创建 `status:needs-review` / `status:blocked`。

涉及后端的 issue 不能只写“做接口”或“接 service”。必须根据 `docs/design/02` 的分层职责矩阵收住 routes（HTTP 薄层）、services（业务编排+事务+计费）、repositories（纯查询）、middlewares（鉴权/RBAC）、lib（纯函数）边界，并写进 `子任务树` 或 `架构 / 分层风险`。

## 控制面沉淀判断

创建 issue 时要判断这件事是否还需要沉淀到其他载体，并在 issue 的 `待确认问题` 或收口信息中说清楚：

- 长期协作规则、反复出错的操作边界：沉淀到合适层级的设计文档（`docs/design/`）。
- 稳定模块边界、架构取舍、运行时原则：更新对应 `docs/design/*.md`。
- 一次性执行细节、临时调试命令、尚未确认的想法：只留在 issue / PR，不写进长期规则。

issue 不需要替这些资产全部改完，但必须提醒后续落点。不要把同一判断只留在聊天里。

## AgentBlog 项目边界

写 issue 时要贴合这些仓库事实：

- 产品是面向 Agent 的博客系统，后端是 Bun + Hono + SQLite + Drizzle + Vercel AI SDK + MCP。
- 后端单进程同进程暴露 `/api`（JWT）、`/api/chat`（流式 + 按 Token 计费）、`/mcp`（Header API Key + 按次计费）三个路由前缀。
- 鉴权两套独立体系：人走 JWT（Bearer Header，7d 过期，无 refresh token），Agent/外部走 API Key（`X-API-Key`，不可逆存储，可吊销）。互不通用，不要叠加。
- Credits 计费：原子扣减（条件 UPDATE + 事务防超扣），余额不足返回 402；MCP 按次、在线 Agent 按 Token；流水写 `credit_log` 可审计；充值限 admin+。
- 文章 slug 一经发布永久不可变；作者多态归属（`author_type` = user/agent）。
- 每用户 ≤1 Agent；API Key 明文仅签发时返回一次。
- 在线 Agent 对话流不落库（不建 message 表，需求强约束）。
- 前端是 Vite + React SPA，三域（阅读/后台/对话）；类型/schema/枚举/错误码单一真相源是 `@agentblog/shared`，前端不重定义。
- 数据访问统一走 Drizzle ORM（不写裸 SQL，迁移除外）；校验统一 Zod；响应统一 `{ ok, data, error }`。
- `runtime/`、真实 `.env`、`data/`（SQLite、上传文件）、secrets 不得进入交付物。

## Issue 正文结构

除非用户给了明确模板，否则正文使用以下结构，保持中文、具体、可审核：

```markdown
## 背景 / 为什么现在做

## 当前要收住的问题

## 目标

## 明确不做

## 相关上下文

## 前置依赖

## 待确认问题

## 子任务树

## 验收口径

## Harness / 验证要求

## 架构 / 分层风险
```

写法要求：

- `背景 / 为什么现在做` 写阻塞链路和漂移风险，不写泛泛价值。
- `当前要收住的问题` 用一句话定义唯一问题。
- `目标` 写 3-5 条边界，不要写成愿景。
- `明确不做` 要点名容易被误带入的未来能力（见下方常见非目标）。
- `相关上下文` 链接 issue、PR、设计文档段落或日志。
- `前置依赖` 写清是否 blocked；没有依赖也明确写“无已知阻塞”。
- `待确认问题` 只放实现者不能自行拍板的问题。
- `子任务树` 面向收敛，不要堆无依赖的待办项；可标注串行/可并行/审核点。
- `验收口径` 至少覆盖“必须成立 / 明确不成立 / 失败信号”。
- `Harness / 验证要求` 只写当前风险需要的最轻验证。
- `架构 / 分层风险` 写清需要由设计文档或实现前收住的职责边界、复用点、数据流、失败路径和验证入口；不涉及时也明确说明“无已知跨边界风险”。

## 质量门槛

写完 issue 草稿后自查：

- 是否能从标题看出问题边界，而不是只有“优化”“完善”“支持”？
- why now 是否解释了不做会导致什么后续漂移？
- 非目标是否足够阻止把未来能力偷带进来？
- 验收是否可被测试、review 或人工检查证明？
- Harness 是否匹配当前风险，没有过重也没有缺失关键验证？
- 架构 / 分层风险是否具体，是否覆盖后端 routes/services/repositories/middlewares 边界、shared 契约、计费原子性、鉴权体系分离、多态作者归属，或前端 page/feature/api/lib 分层？
- 若涉及新模块或目录，是否说明为什么现有 `apps/api`、`apps/web`、`packages/shared` 边界接不住？

## AgentBlog 常见非目标

按 issue 主题选择，不要机械全写：

- 不引入 refresh token（单 access token 7d 过期足够，见 04）。
- 不用 Cookie 承载会话（选定 Bearer Header，见 04）。
- 不为 MCP 单独成 app（单进程共享工具定义，见 02）。
- 不持久化对话记录（需求强约束，见 10）。
- 不在 routes 层写业务规则或直接操作数据库（见 02 分层矩阵）。
- 不在前端重定义已存在于 `@agentblog/shared` 的类型/schema/枚举（见 02 §1.1）。
- 不引入重型 E2E，除非交互风险超过接口冒烟 + MCP 联调能覆盖的范围（见 13）。
- 不写裸 SQL（迁移除外），不直接 `process.env.XXX`（见 01 §7.3）。
- 不把 `data/`、`.env`、secrets、上传文件提交进仓库。

## 标签和 gh

- 默认 repo：`BqLee-AI/AgentBlog`。
- 创建 issue 前按 `references/label-policy.md` 选择标签。
- 如果远端缺少本 skill 的标准标签，先运行：

```bash
python3 .agents/skills/gh-issue-create/scripts/sync_repo_labels.py --repo BqLee-AI/AgentBlog
```

- 使用非交互式 `gh issue create`，正文先写入临时 markdown 文件，再用 `--body-file`。
- 创建后必须回读：

```bash
gh issue view <number> --repo BqLee-AI/AgentBlog --json title,labels,url,state
```

如果标签不完整，立即用 `gh issue edit` 修正；不要只挂 GitHub 默认 `enhancement` / `documentation`。

## 返回给用户

创建或整理完成后至少返回：

- issue 标题和 URL
- label 集合
- 它现在是 `needs-review`、`ready` 还是 `blocked`
- 关联的设计文档或下一步应更新的文档
