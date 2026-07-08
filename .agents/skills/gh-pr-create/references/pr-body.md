# PR Body 模板

```markdown
## 关联

- Issue:
- 设计文档:

## 背景

## 改动

## 验证

## 风险与未验证项

## Review Notes
```

## 写法

- `关联` 写 issue URL、设计文档段落（如 `docs/design/06` §十）或相关 PR 评论。
- `背景` 写这次 PR 为什么这样改，不重复粘贴完整 issue。
- `改动` 按后端 API / 前端 / shared / MCP / 设计文档等边界组织。
- `验证` 写实际运行的命令和结果；失败或跳过要写原因。
- `风险与未验证项` 写 review 需要关注的残余风险（如未跑并发测试、未联调流式）。
- `Review Notes` 预先解释容易被 AI review 误判的点，例如新版本 API、非目标、刻意不做的抽象。

## 改动段的组织示例

按边界而非文件流水账：

```markdown
## 改动

### 后端 (apps/api)
- `modules/credit/credit.service.ts`：`tryDeduct` 改用条件 UPDATE + 事务，防超扣（对齐 08）
- `routes/credits.routes.ts`：充值限 admin+，`/me/logs` 仅自己

### MCP (apps/api/src/mcp)
- 工具注册复用 `ai/tools.ts`，按次计费包进 withBilling（对齐 09）

### 验证
- `cd apps/api && bun test tests/credit` → 并发 100 次扣减余额 50，成功 50 次 ✅
- MCP Inspector 联调：tools/list 5 个工具，list_post 扣 1 credit ✅
```

## AI Review 预防性说明

如果使用较新的技术栈或本仓库已有局部约定，PR body 应写明依据：

- 当前 lockfile / package version（Vercel AI SDK、MCP SDK、Drizzle、Hono）。
- 官方文档或现有代码模式。
- 为什么没有采用 AI 可能建议的旧 API、过度抽象或通用最佳实践。

例如：

```markdown
## Review Notes
- `streamText` 的 `onFinish` 用法依据 Vercel AI SDK v5，`toUIMessageStreamResponse()` 是 v5 API；若 reviewer 看到 `toDataStreamResponse()` 那是 v3/v4 旧 API。
- 在线对话刻意不落库（需求 §1.2/§5 强约束），不要建议加 message 表。
- MCP 不单独成 app（单进程共享工具定义，见 02 §1.1），不要建议拆 packages/tools。
```

这样不是为了防御 review，而是让 reviewer 更快判断建议是否适用于当前项目。
