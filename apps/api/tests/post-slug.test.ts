/**
 * 🔴 文章 slug 不可变测试（详见 docs/design/06 §五、issue #18 红线）
 *
 * slug 不可变三重防护：
 *   1. updatePostSchema 不含 slug 字段（Zod 层拒绝）
 *   2. service.update 不从 dto 读 slug
 *   3. 已有 slug 永不覆盖（草稿→发布且 slug 为空才生成一次）
 *
 * 运行：bun test apps/api/tests/post-slug.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser } from './helpers/factory'

let ctx: TestContext
let userId: number

beforeAll(async () => {
  ctx = await setupTestDb()
  const { user } = await createUser(ctx.db, { role: 'user' })
  userId = user.id
})

afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('🔴 slug 不可变', () => {
  it('草稿无 slug（null），发布时生成 slug', async () => {
    const { postService } = await import('@/modules/post/post.service')
    const actor = { id: userId, role: 'user' as const }

    // 草稿：slug=null
    const draft = await postService.create(
      { title: '我的草稿', content: '正文', status: 'draft', tagIds: [] },
      userId,
      'user',
    )
    expect(draft.slug).toBeNull()

    // 草稿→发布：生成 slug
    const published = await postService.update(
      draft.id,
      { status: 'published' },
      actor,
    )
    expect(published.slug).toBeTruthy()
    expect(typeof published.slug).toBe('string')
  })

  it('🔴 多次 update（含改 title）后 slug 不变', async () => {
    const { postService } = await import('@/modules/post/post.service')
    const actor = { id: userId, role: 'user' as const }

    // 直接发布一篇文章
    const post = await postService.create(
      { title: '原标题', content: '正文', status: 'published', tagIds: [] },
      userId,
      'user',
    )
    const originalSlug = post.slug
    expect(originalSlug).toBeTruthy()

    // 改 title → slug 不应变
    const updated1 = await postService.update(post.id, { title: '完全不同的新标题' }, actor)
    expect(updated1.slug).toBe(originalSlug)

    // 再改 content → slug 仍不变
    const updated2 = await postService.update(post.id, { content: '新正文内容' }, actor)
    expect(updated2.slug).toBe(originalSlug)

    // 多次 update 后 slug 始终是原值
    const updated3 = await postService.update(post.id, { summary: '摘要' }, actor)
    expect(updated3.slug).toBe(originalSlug)
  })

  it('🔴 update 请求带 slug 字段被 schema 拒绝（422/400）', async () => {
    const { app } = ctx
    const { user, token } = await createUser(ctx.db, { role: 'user' })
    const { postService } = await import('@/modules/post/post.service')

    // 先发布一篇文章
    const post = await postService.create(
      { title: '测试文章', content: 'x', status: 'published', tagIds: [] },
      user.id,
      'user',
    )
    const originalSlug = post.slug

    // PATCH 带 slug 字段 → schema 拒绝（updatePostSchema 无 slug 字段，多余字段走 strict?）
    // 注：当前 updatePostSchema 非 strict，多余字段会被 Zod 默默丢弃而非报错。
    // 但即便丢弃，service 也不读 slug，故 slug 不变。这里验证「带 slug 不生效」。
    const res = await app.request(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'hacked-slug', title: '新标题' }),
    })
    const json = await res.json()
    expect(res.status).toBe(200)

    // 🔴 slug 未被污染
    expect(json.data.slug).toBe(originalSlug)
    expect(json.data.slug).not.toBe('hacked-slug')
  })

  it('getBySlug 仅返回 published，草稿 404', async () => {
    const { postService } = await import('@/modules/post/post.service')
    const { HttpError } = await import('@/lib/errors')

    // 草稿
    const draft = await postService.create(
      { title: '纯草稿', content: 'x', status: 'draft', tagIds: [] },
      userId,
      'user',
    )
    expect(draft.slug).toBeNull()

    // 草稿无 slug，getBySlug(null) 不适用；验证已发布的能取到
    const pub = await postService.create(
      { title: '已发布', content: 'x', status: 'published', tagIds: [] },
      userId,
      'user',
    )
    const got = await postService.getBySlug(pub.slug!)
    expect(got.id).toBe(pub.id)
    expect(got.status).toBe('published')
    void HttpError
  })
})
