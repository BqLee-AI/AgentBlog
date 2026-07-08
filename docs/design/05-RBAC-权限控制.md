# 05 · RBAC 权限控制

> 本篇实现需求 §2.3 三角色权限：`super_admin` / `admin` / `user`，以及「仅限自有资源」的访问控制。
> 对应任务 6「RBAC 角色与权限控制」。
>
> **强约束**：三角色权限矩阵严格对齐需求 §2.3。

---

## 一、权限矩阵（来自需求 §2.3）

| 操作 | super_admin | admin | user |
|------|:-----------:|:-----:|:----:|
| 系统级配置、角色/权限定义 | ✅ | ❌ | ❌ |
| 用户管理（建用户、改角色） | ✅ | ✅ | ❌ |
| 文章管理（任意人的文章） | ✅ | ✅ | 仅自己 |
| Credits 发放、用量统计 | ✅ | ✅ | ❌（仅看自己） |
| 创建/管理自己的 Agent（≤1） | ✅ | ✅ | ✅ |
| 管理自己的 API Key | ✅ | ✅ | ✅ |
| 发布自己的文章 | ✅ | ✅ | ✅ |
| 在线 Agent 对话（消耗自己 credits） | ✅ | ✅ | ✅ |
| 读取已发布文章（阅读页） | 公开 | 公开 | 公开 |

## 二、设计要点

### 2.1 两层校验

1. **角色级校验**（粗粒度）：用 `requireRole(...)` 中间件，挡掉没权限的角色。例：建用户接口只放 admin/super_admin。
2. **资源级校验**（细粒度）：在 service 里判断「这个资源是不是当前用户的」。例：user 改文章要先查文章的 author_id 是否等于自己。

> 💡 不能只靠中间件——中间件不知道你要操作的资源归谁。资源归属校验必须在 service 里，因为只有 service 拿到资源后才能比对。

### 2.2 角色等级

```ts
// lib/role.ts
export const ROLE_LEVEL: Record<string, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
}

export function hasRole(actual: string, required: string[]): boolean {
  return required.includes(actual)
}

// 高等级包含低等级权限（可选策略，本系统显式列举更安全）
export function atLeast(actual: string, min: string): boolean {
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[min]
}
```

## 三、角色中间件（`src/middlewares/rbac.ts`）

```ts
import type { MiddlewareHandler } from 'hono'
import { HttpError } from '@/lib/errors'

/**
 * 要求当前用户角色在白名单内。必须挂在 authMiddleware 之后。
 * @example requireRole('admin', 'super_admin')
 */
export function requireRole(...roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) throw HttpError.unauthorized('未登录')  // 防御性，理论上 auth 已挡
    if (!roles.includes(user.role)) {
      throw HttpError.forbidden('无权执行此操作')
    }
    await next()
  }
}
```

使用示例（在路由层挂载）：

```ts
import { authMiddleware } from '@/middlewares/auth'
import { requireRole } from '@/middlewares/rbac'

usersRoutes
  .use('*', authMiddleware)
  .get('/', requireRole('admin', 'super_admin'), /* 列出用户 */)
  .post('/', requireRole('admin', 'super_admin'), /* 建用户 */)
```

## 四、资源归属校验（service 层）

以文章为例——user 只能改自己的文章：

```ts
// modules/post/post.service.ts
export const postService = {
  async update(postId: number, dto: UpdatePostDTO, actor: { id: number; role: string }) {
    const post = await postRepository.findById(postId)
    if (!post) throw HttpError.notFound('文章不存在')

    // 资源归属校验
    const isOwner = post.authorType === 'user' && post.authorId === actor.id
    const canManageOthers = actor.role === 'admin' || actor.role === 'super_admin'
    if (!isOwner && !canManageOthers) {
      throw HttpError.forbidden('无权修改他人文章')
    }

    return postRepository.update(postId, dto)
  },

  async remove(postId: number, actor: { id: number; role: string }) {
    const post = await postRepository.findById(postId)
    if (!post) throw HttpError.notFound('文章不存在')
    const isOwner = post.authorType === 'user' && post.authorId === actor.id
    if (!isOwner && actor.role === 'user') {
      throw HttpError.forbidden('无权删除他人文章')
    }
    return postRepository.delete(postId)
  },
}
```

> 💡 admin/super_admin 可管理任意文章；user 只能管自己的。Agent 发的文章（`authorType==='agent'`）只能由该 Agent 的主人（或 admin）管理——校验时要把 agent → user 反查（见 07）。

## 五、Agent 归属校验（跨实体）

每用户 ≤1 Agent（需求 §4.3）。管理 Agent 时校验「这个 Agent 是我的」：

```ts
// modules/agent/agent.service.ts
export const agentService = {
  async update(agentId: number, dto: UpdateAgentDTO, actor: { id: number; role: string }) {
    const agent = await agentRepository.findById(agentId)
    if (!agent) throw HttpError.notFound('Agent 不存在')
    if (agent.userId !== actor.id && actor.role !== 'admin' && actor.role !== 'super_admin') {
      throw HttpError.forbidden('无权操作他人 Agent')
    }
    return agentRepository.update(agentId, dto)
  },
}
```

## 六、Credits 发放权限（admin 专属）

需求 §2.3：Credits 发放是管理员职责。

```ts
// routes/credits.routes.ts
credits
  .use('*', authMiddleware)
  .post('/recharge', requireRole('admin', 'super_admin'), /* 给某用户充值 */)
  .get('/logs/:userId', requireRole('admin', 'super_admin'), /* 查某人流水 */)
  .get('/me/logs', /* 普通用户查自己流水 */)
```

> 💡 普通用户只能 `GET /api/credits/me/logs` 看自己的流水，不能看别人的，也不能充值。

## 七、完整路由鉴权速查表

| 路由 | 角色要求 | 资源校验 |
|------|----------|----------|
| `POST /api/auth/login` | 公开 | — |
| `GET /api/auth/me` | 任意登录 | — |
| `POST /api/auth/register` | admin+ | — |
| `GET /api/users` | admin+ | — |
| `PATCH /api/users/:id/role` | super_admin | — |
| `POST /api/posts` | 任意登录 | — |
| `PATCH /api/posts/:id` | 任意登录 | 自己的或 admin+ |
| `DELETE /api/posts/:id` | 任意登录 | 自己的或 admin+ |
| `GET /api/posts/:slug` | 公开（已发布） | — |
| `POST /api/agents` | 任意登录 | 每用户≤1 |
| `PATCH /api/agents/:id` | 任意登录 | 自己的或 admin+ |
| `POST /api/agents/:id/api-keys` | 任意登录 | Agent 是自己的 |
| `DELETE /api/api-keys/:id` | 任意登录 | Key 所属 Agent 是自己的 |
| `POST /api/credits/recharge` | admin+ | — |
| `GET /api/credits/me/logs` | 任意登录 | 仅自己 |
| `POST /api/chat` | 任意登录 | 消耗自己 credits |
| `POST /api/upload` | 任意登录 | — |
| `/mcp/*` | Header API Key | 按 Key 对应用户计费 |

## 八、超管专属操作（仅 super_admin）

| 操作 | 说明 |
|------|------|
| 修改用户角色 | `PATCH /api/users/:id/role`，仅超管 |
| 删除管理员 | 仅超管可删 admin，防越权 |
| 系统配置 | 若有 system_config 表，仅超管 |

## 九、错误码与提示（见 12）

权限相关错误统一用中文：
- 未登录 → 401 `未提供认证信息` / `登录已过期`
- 角色不足 → 403 `无权执行此操作`
- 资源非自己 → 403 `无权修改他人文章` / `无权操作他人 Agent`

## 十、验收用例

| 用例 | 操作 | 预期 |
|------|------|------|
| user 调建用户 | POST /register | 403 |
| admin 调建用户 | POST /register | 201 |
| user 改别人文章 | PATCH /posts/他人id | 403 |
| user 改自己文章 | PATCH /posts/自己id | 200 |
| user 看他人流水 | GET /credits/logs/他人id | 404 或 403 |
| user 给自己充值 | POST /credits/recharge | 403 |

## 十一、本篇交付物清单（D2）

- [ ] `middlewares/rbac.ts` 的 `requireRole` 完成
- [ ] 文章/Agent/API Key 的 service 都有资源归属校验
- [ ] Credits 发放限 admin+
- [ ] 与李钊对齐：每条路由的鉴权要求文档化（用本篇速查表）

---

**下一篇**：[06 · 文章模块](./06-文章模块.md)
