# Issue 写作原则

## 合格 issue 的定义

合格的 AgentBlog 开发 issue 是一个可接手、可验证、边界清楚的小问题。它通常来自：

- 设计文档（`docs/design/*.md`）和当前实现之间的缺口
- 已实现能力暴露出的契约、验证或体验风险
- 需要先被收口的架构或产品边界
- PR review 或联调中暴露的待办

它不是：

- 多个产品能力混在一起的大包
- 只有 “实现 X” 的施工标题
- 没有背景、非目标和验收的占位符

## Discussion 到 Issue 的压缩方式

从讨论、PR 评论或用户粗略需求生成 issue 时，按这个顺序压缩：

1. 先找真正的担心：现在继续模糊会让哪个设计、实现或验证漂移？
2. 再选本轮的一刀：只收一个问题，不把相邻能力一起带进来。
3. 再写非目标：明确哪些能力留给后续 issue。
4. 再写证据链：链接设计文档段落、PR、日志、issue 或代码位置。
5. 最后写验收：让后续实现和 PR review 能判断是否完成。

不要把讨论原文搬进 issue。issue 应该是讨论被加工后的协作对象。

## Readiness 检查

任一问题答不清时，不要标记 `status:ready`：

1. 为什么现在要做？
2. 这一刀收住的单一问题是什么？
3. 哪些内容明确不做？
4. 哪些上游设计文档、issue 或 PR 是输入？
5. 什么结果算成功，什么结果明确不算成功？
6. 哪些点需要维护者确认，不能由实现者自行脑补？

## 分层和边界检查

如果 issue 要新增目录、模块或长期抽象，必须额外说明：

- 现有 `apps/api`、`apps/web`、`packages/shared` 哪个边界最接近？
- 为什么不能放进已有边界？
- 新模块的上游和下游依赖是什么？
- 是否会让 routes 层承载业务逻辑，或让 repository 调用其他 service（违反分层铁律）？
- 是否破坏 `@agentblog/shared` 单一真相源（在前端重定义契约）？

涉及计费、鉴权、MCP 工具的 issue 必须额外收住：

- 计费：扣减是否原子（条件 UPDATE + 事务），余额不足是否 402，流水是否落库。
- 鉴权：JWT 与 API Key 是否分离不混用，资源归属校验是否在 service 层。
- MCP 工具：是否复用 `ai/tools.ts`，按次计费是否在工具成功后扣。

没有明确复用需求或跨 app 需求时，不要为“以后可能用”创建模块。

## 新技术栈检查

涉及较新的框架、库或 API（Vercel AI SDK、MCP SDK、Drizzle、Hono、TanStack Query、shadcn/ui）时，issue 要提醒实现者不要盲信模型记忆：

- 优先查本仓库已安装版本、lockfile、README 和现有代码。
- 必要时查官方文档或 package release notes。
- AI review 或模型建议可能基于旧版本 API；需要用当前版本验证。
- 如果采用新依赖，说明为什么现有栈不能满足，以及最小验证命令。

## AgentBlog 常见非目标

按 issue 主题选择，不要机械全写：

- 不引入 refresh token（单 access token 7d 过期足够）。
- 不用 Cookie 承载会话（选定 Bearer Header）。
- 不为 MCP 单独成 app（单进程共享工具定义）。
- 不持久化对话记录（需求强约束）。
- 不在 routes 层写业务规则或直接操作数据库。
- 不在前端重定义已存在于 `@agentblog/shared` 的类型/schema/枚举。
- 不引入重型 E2E，除非交互风险超过接口冒烟 + MCP 联调能覆盖的范围。
- 不写裸 SQL（迁移除外），不直接 `process.env.XXX`。
- 不把 `data/`、`.env`、secrets、上传文件提交进仓库。

## Harness 选择

验证跟风险走：

- 后端接口冒烟 / 业务关键路径：`cd apps/api && bun test`
- 计费并发安全：`cd apps/api && bun test tests/credit`
- 单元（slug/hash/crypto/token 换算）：`cd apps/api && bun test`
- MCP 联调：`npx @modelcontextprotocol/inspector --transport http --url http://localhost:3000/mcp --header "X-API-Key: sk_live_xxx"`
- 前端单元 / 组件：`cd apps/web && bun run test`
- 类型检查：`bun run typecheck`（根脚本，跑所有 workspace）
- 静态检查：`bun run lint`、`bun run build`

不要把外部网络、真实 LLM 调用（除非 issue 明确需要）、真实凭证或生产数据写成默认验收条件。
