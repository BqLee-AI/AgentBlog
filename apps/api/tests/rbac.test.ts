/**
 * RBAC 权限边界测试（详见 docs/design/05、issue #24）
 *
 * 三角色矩阵边界：user / admin / super_admin 的接口权限。
 * 资源归属：user 改他人文章 → 403。
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser } from './helpers/factory'

let ctx: TestContext

beforeAll(async () => {
  ctx = await setupTestDb()
})
afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('RBAC 权限边界', () => {
  it('无 token 访问受保护接口 → 401', async () => {
    const res = await ctx.app.request('/api/users', {
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(401)
  })

  it('user 访问 admin 接口（用户列表）→ 403', async () => {
    const { token } = await createUser(ctx.db, { role: 'user' })
    const res = await ctx.app.request('/api/users', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(403)
  })

  it('admin 访问 admin 接口（用户列表）→ 200', async () => {
    const { token } = await createUser(ctx.db, { role: 'admin' })
    const res = await ctx.app.request('/api/users', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
  })

  it('改用户角色仅 super_admin：user/admin → 403，super_admin → 200', async () => {
    const target = await createUser(ctx.db, { role: 'user' })

    // user 改角色 → 403
    const userToken = (await createUser(ctx.db, { role: 'user' })).token
    let res = await ctx.app.request(`/api/users/${target.user.id}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(res.status).toBe(403)

    // admin 改角色 → 403（仅 super_admin）
    const adminToken = (await createUser(ctx.db, { role: 'admin' })).token
    res = await ctx.app.request(`/api/users/${target.user.id}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(res.status).toBe(403)

    // super_admin 改角色 → 200
    const superToken = (await createUser(ctx.db, { role: 'super_admin' })).token
    res = await ctx.app.request(`/api/users/${target.user.id}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.role).toBe('admin')
  })

  it('user 改他人文章 → 403；改自己文章 → 200', async () => {
    const owner = await createUser(ctx.db, { role: 'user' })
    const other = await createUser(ctx.db, { role: 'user' })

    // owner 发一篇文章
    const createRes = await ctx.app.request('/api/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'owner的文章', content: 'x', status: 'published', tagIds: [] }),
    })
    const created = await createRes.json()
    const postId = created.data.id

    // other 改 owner 文章 → 403
    const res = await ctx.app.request(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${other.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '被篡改' }),
    })
    expect(res.status).toBe(403)

    // owner 改自己 → 200
    const res2 = await ctx.app.request(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新标题' }),
    })
    expect(res2.status).toBe(200)
  })
})
