---
name: ai-code-review
description: 用于对本仓库 PR、commit、diff 或代码变更做 AI Code Review；当用户要求 review PR、review commit、review diff、代码审查、CR 规范检查、AI CR 或检查变更是否符合 AgentBlog 分层与模块边界时使用。
license: Proprietary
compatibility:
  agent: '*'
metadata:
  language: zh-CN
  scope: ai-code-review
  repo: BqLee-AI/AgentBlog
---

# ai-code-review

这个 skill 用来主动审查 AgentBlog 的代码变更。它不是通用语言 checklist，也不是替代维护者判断的自动结论。

目标是让 review 基于本仓库真源、当前 diff 和模块 reference，找出真实 bug、分层边界破坏、安全/计费/鉴权风险、契约漂移、测试缺口和需要维护者讨论的设计问题。

## 先读什么

1. `README.md`、`docs/design/README.md`（文档导航）
2. 相关 `docs/design/*.md`；设计文档是长期真相层（后端 00~14、前端 frontend/*）
3. PR / commit / diff 元信息、changed files、base/head、用户指定关注点
4. 关联 issue、PR 评论和 CI 结果
5. 涉及 `apps/api/**` 时，先读 `references/api/overview.md`；后端分层、计费、鉴权、MCP、流式各有场景索引
6. 涉及 `apps/web/**` 时，先读 `references/web/overview.md`；前端 page/feature/api/lib 分层与契约边界有场景索引
7. 涉及 `packages/shared/**` 时，按 shared 契约边界审查（见 `references/shared/overview.md`）
8. 需要统一输出格式时读 `references/shared/review-output.md`

不要一次性加载所有模块细则。先用 changed files、imports、调用形态和 diff 内容选择相关 reference。

后端变更常同时涉及多个边界：例如 Credits 计费可能同时触及 `modules/credit/**`（原子扣减）、`modules/api-key/**` 或 `modules/agent/**`（鉴权主体）、`mcp/**` 或 `ai/**`（计费嵌入点）、`lib/errors.ts`（402 错误）。不要只按单一路径审查，要顺着请求链路和计费链路追完。

## Review 流程

1. 明确审查对象：PR、commit range、单个 commit、工作区 diff，或用户粘贴的 patch。
2. 列出 changed files，并按路径和变更类型归类（后端 routes/modules/middlewares/lib/ai/mcp、前端 pages/features/api/lib、shared 契约）。
3. 读取相关真源和 overview reference，必要时再读 overview 里指向的场景细则。
4. 对 diff 做证据驱动审查，只对能从当前代码、设计文档、分层规范或验证结果证明的问题给 finding。
5. 如果建议来自通用最佳实践，但仓库真源没有支撑，标为 question / residual risk，不要写成 must-fix。
6. 对较新框架、库 API 或工具行为（Vercel AI SDK、MCP SDK、Drizzle、Hono 版本特性），先看 lockfile、已安装版本、现有代码和官方文档；不要只靠模型记忆。
7. 用普通 Markdown 输出 findings、open questions、验证建议和残余风险；需要贴到变更行的意见才使用 `::code-comment{...}`。

## Finding 分类

- `must-fix`：真实 bug、安全问题、计费超扣、鉴权绕过、契约破坏、仓库红线（slug 不可变、API Key 不可逆存储、对话不落库、原子扣减）、关键测试缺口。
- `should-fix`：范围内、成本低、证据充分的质量问题。
- `needs-discussion`：会改变范围、设计、模块边界、契约或验收口径的问题。
- `defer`：有价值但超出当前 PR，应进入后续 issue。
- `not-applicable`：通用建议不适用于当前仓库、当前版本、当前非目标或被现有设计明确排除。

不要因为发现“可以更好”就输出 finding。Code Review 优先报告会影响正确性、边界、安全、计费、契约、可维护性或验证可信度的问题。

## 仓库特有红线（must-fix 倾向）

AgentBlog 有几条需求强约束，违反即 must-fix：

- **slug 永久不可变**：文章一旦发布，`slug` 不允许在任何更新路径被修改（见 06）。`update_post` 工具和 `PATCH /api/posts/:id` 都必须忽略或拒绝 slug 字段。
- **API Key 不可逆存储**：库里只能存 SHA-256 哈希，明文仅签发时返回一次，列表/详情绝不返回明文（见 07）。绝不能明文或对称加密入库。
- **在线对话不落库**：`/api/chat` 与 MCP 流程**禁止**向 `message`/`conversation` 表写记录——v1 根本不建这些表（见 10）。出现 `db.insert(messages)` 之类即红线。
- **Credits 原子扣减防超扣**：扣减必须用条件 UPDATE（`WHERE credits >= amount`）+ 事务，不能「先查后扣」；余额不足必须返回 402（见 08）。
- **双鉴权体系互不通用**：`/api/*` 走 JWT（`authMiddleware`），`/mcp/*` 走 Header API Key（`apiKeyMiddleware`），不要叠加或混用（见 09 §1.1）。
- **依赖方向铁律**：后端 `routes → services → repositories → db` 不得反向，`@agentblog/shared` 是契约不是依赖环；前端 `pages → features(use*) → api → lib(request) → shared` 不得反向。
- **契约单一真相源**：跨前后端复用的类型/Zod schema/枚举/错误码只在 `@agentblog/shared` 定义一次，后端 DTO 与前端表单都从 shared 引入，不在前端重写。
- **不提交 secrets / runtime 数据**：`.env`、`data/`（SQLite 文件、上传文件）不得进入提交。

## 输出要求

默认输出普通 Markdown，不输出 JSON、XML、findings object 或其他结构化 review schema。

每条 finding 必须包含：

- 级别：`must-fix` / `should-fix` / `needs-discussion` / `defer` / `not-applicable`
- 文件和行号：尽量指向 diff 中最小可行动位置
- 规则来源：设计文档编号（如 `docs/design/08`）、分层规范（`docs/design/02`）、reference overview 或现有代码模式
- 证据：当前 diff 中触发问题的具体代码或行为
- 影响：为什么这会破坏分层边界、行为、契约、计费、安全或验证
- 建议修法：可执行的修改方向
- 验证建议：最小有效验证命令或人工检查点

如果没有 finding，明确说“未发现必须修改的问题”，并说明仍未覆盖的范围或未运行的验证。

只有当反馈需要直接贴到 changed line 时，才发出 `::code-comment{...}` inline comment 指令。没有可行动行级意见时，不要发任何 inline comment 指令。

## 关联 reference

- 输出格式：`references/shared/review-output.md`
- 后端分层与场景索引：`references/api/overview.md`
- 前端分层与场景索引：`references/web/overview.md`
- 共享契约边界：`references/shared/overview.md`

未来新增模块（如独立的 worker、CLI 工具）时，只在对应 overview 里加入导航，不把细则塞回 `SKILL.md`。

## 边界

- 本 skill 负责主动 review diff；处理已有 PR 评论或 CI 评论时，直接在 review 中引用，不另开工作流。
- 不自动修改代码，除非用户明确要求从 review 转入修复。
- 不接入 CI、GitHub bot 或自动阻塞 merge。
- 不把未确认想法写成仓库红线；需要长期沉淀时建议进入 `docs/design/` 或后续 issue。
