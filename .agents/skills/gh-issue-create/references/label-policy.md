# Label 策略

本仓库当前没有 `.github/labels.yml` 真相源。使用 `scripts/sync_repo_labels.py` 内置的标准标签集同步远端。

## 最小标签集合

每个开发 issue 至少需要：

- 一个 `type:*`
- 一个 `priority:*`
- 一个 `status:*`

影响范围明确时补一个或多个 `area:*`。复杂度能判断时补一个 `complexity:*`。

## type

- `type:feature`：产品、API、Web、Agent、MCP、计费能力。
- `type:bug`：已有行为错误或回归。
- `type:docs`：只改文档、说明或设计文档。
- `type:test`：主要补验证、fixture 或测试基础设施。
- `type:chore`：仓库维护、脚手架、依赖或工具链。
- `type:refactor`：不改变外部行为的内部整理。
- `type:discussion`：用户明确要讨论型 issue 时才用。

## priority

- `priority:high`：阻塞当前排期、多个后续 issue 或关键验证链路（如计费、鉴权、MCP 联调）。
- `priority:medium`：默认值。
- `priority:low`：有价值但不在当前关键路径上。

## status

- `status:needs-review`：默认新建状态，需要维护者确认。
- `status:ready`：目标、非目标、验收、未决点和分层风险都清楚。
- `status:blocked`：被明确上游决策、依赖或权限卡住。
- `status:in-progress`：已有人接手。

## area

按主要写入边界选择，不要为了完整把所有 area 都挂上：

- `area:api`：后端 `apps/api`（routes/modules/middlewares/lib/ai/mcp/db）。
- `area:web`：前端 `apps/web`（pages/features/api/lib/components）。
- `area:shared`：`packages/shared` 契约（类型/schema/枚举/错误码）。
- `area:mcp`：MCP Server 与工具。
- `area:agent`：Agent 与 API Key 模块、在线运行环境。
- `area:credits`：计费与流水。
- `area:auth`：认证、RBAC、鉴权中间件。
- `area:db`：数据库 schema、迁移、种子。
- `area:docs`：设计文档、README。
- `area:infra`：构建、Docker、部署、工具链、环境变量。

## complexity

- `complexity:small`：单 area，1-2 个清晰任务。
- `complexity:medium`：默认值，跨 1-2 个 area 或 3-5 个子任务。
- `complexity:large`：跨多个 area，需要明显协调或分阶段（如同时改后端计费 + MCP + 前端展示）。
