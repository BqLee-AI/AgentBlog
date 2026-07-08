# ai/ —— 在线 Agent 运行环境

详见 docs/design/10。基于 Vercel AI SDK streamText，按 Token 计费，不持久化聊天记录。

| 文件 | 职责 |
|------|------|
| `runtime.ts` | `streamText` 封装（注入 System Prompt + 工具） |
| `tools.ts` | 内置文章 CRUD 工具（**与 MCP 共用同一份定义**，见 docs/design/09） |
| `billing.ts` | Token → credits 换算 + 流后扣费 |

> 待任务 16 实现。
