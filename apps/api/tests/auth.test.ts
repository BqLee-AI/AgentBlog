/**
 * 认证测试（详见 docs/design/04、TC-001）
 *
 * 自助注册、登录、/me、token 失效。
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'

let ctx: TestContext

beforeAll(async () => {
  ctx = await setupTestDb()
})
afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('认证', () => {
  it('自助注册公开（无 token）→ 201，角色固定 user', async () => {
    const res = await ctx.app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `new_${Date.now()}`, password: 'pass1234' }),
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.role).toBe('user')
    expect(json.data.credits).toBe(0)
  })

  it('注册带 role 字段被拒（不能自助提权）', async () => {
    const res = await ctx.app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `hack_${Date.now()}`, password: 'pass1234', role: 'admin' }),
    })
    // registerSchema.strict() 拒绝多余字段
    expect(res.status).toBe(400)
  })

  it('登录正确账密 → 200 + token', async () => {
    const username = `login_${Date.now()}`
    await ctx.app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    })
    const res = await ctx.app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.token).toBeTruthy()
    expect(json.data.user.username).toBe(username)
  })

  it('登录错误密码 → 401（防枚举：统一消息）', async () => {
    const username = `wrong_${Date.now()}`
    await ctx.app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    })
    const res = await ctx.app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'wrongpass' }),
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.message).toBe('用户名或密码错误')
  })

  it('/me 用 token → 200', async () => {
    const username = `me_${Date.now()}`
    const regRes = await ctx.app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    })
    const loginRes = await ctx.app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'pass1234' }),
    })
    const token = (await loginRes.json()).data.token
    void regRes

    const res = await ctx.app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.username).toBe(username)
  })

  it('无效 token → 401', async () => {
    const res = await ctx.app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    })
    expect(res.status).toBe(401)
  })

  it('无 token 访问 /me → 401', async () => {
    const res = await ctx.app.request('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
