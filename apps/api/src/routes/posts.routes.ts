/**
 * 文章路由（详见 docs/design/06 §七）
 *
 * 挂载于 /api/posts（由 routes/index.ts 聚合）。
 *
 * 📌 公开/鉴权分区：
 *   - 公开（不挂 authMiddleware）：GET /（列表，仅 published）、GET /:slug（详情，仅 published）
 *   - 需登录：POST /、GET /by-id/:id、PATCH /:id、DELETE /:id
 *
 * 📌 路由声明顺序（Hono 按声明顺序匹配）：
 *   `/by-id/:id` 比 `/:slug` 更具体，但二者路径段形式相同。
 *   本路由把 `/by-id/:id` 放在 authMiddleware 之后的「需登录」区，而 `/:slug` 在公开区先声明，
 *   两者不会冲突——公开区只认 `/:slug`，登录区的 `/by-id/:id` 是不同字面量前缀。
 *
 * 📌 资源归属校验在 service 层（update/remove 传 actor），不在中间件。
 */
import { Hono } from 'hono'
import { ok } from '@/lib/response'
import { zodCheck } from '@/lib/zod-check'
import { authMiddleware } from '@/middlewares/auth'
import { postService } from '@/modules/post/post.service'
import { createPostSchema, updatePostSchema, listPostsQuerySchema } from '@/modules/post/post.schema'
import { withAuthor } from '@/modules/post/post.author'

export const postsRoutes = new Hono()

// ── 公开：列表（仅 published）──
postsRoutes.get('/', zodCheck('query', listPostsQuerySchema), async (c) => {
  const query = c.req.valid('query')
  const result = await postService.list(query, true) // isPublicView=true 强制 published
  const items = await Promise.all(result.items.map(async (p) => ({ ...p, author: await withAuthor(p) })))
  return ok(c, { ...result, items })
})

// ── 公开：详情（按 slug，仅 published）──
postsRoutes.get('/:slug', async (c) => {
  const post = await postService.getBySlug(c.req.param('slug'))
  return ok(c, { ...post, author: await withAuthor(post) })
})

// ── 以下需登录 ──
postsRoutes.use('*', authMiddleware)

// 创建文章（user 作者路径；agent 作者路径由 MCP #21 走）
postsRoutes.post('/', zodCheck('json', createPostSchema), async (c) => {
  const dto = c.req.valid('json')
  const post = await postService.create(dto, c.var.user.id, 'user')
  return ok(c, { ...post, author: await withAuthor(post) }, 201)
})

// 后台编辑用：按 id 取（含草稿）。草稿仅 owner/admin+ 可读（review should-fix-1）
postsRoutes.get('/by-id/:id', async (c) => {
  const post = await postService.getByIdForEdit(Number(c.req.param('id')), {
    id: c.var.user.id,
    role: c.var.user.role,
  })
  return ok(c, { ...post, author: await withAuthor(post) })
})

// 更新（🔴 updatePostSchema 无 slug 字段；资源归属在 service）
postsRoutes.patch('/:id', zodCheck('json', updatePostSchema), async (c) => {
  const dto = c.req.valid('json')
  const post = await postService.update(
    Number(c.req.param('id')),
    dto,
    { id: c.var.user.id, role: c.var.user.role },
  )
  return ok(c, { ...post, author: await withAuthor(post) })
})

// 删除
postsRoutes.delete('/:id', async (c) => {
  await postService.remove(Number(c.req.param('id')), { id: c.var.user.id, role: c.var.user.role })
  return ok(c, { deleted: true })
})
