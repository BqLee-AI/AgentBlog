/**
 * Agent 每用户 ≤1 测试（详见 docs/design/07 §1.3、TC-003）
 *
 * 需求 §4.3：每用户最多 1 个 Agent。第二次创建 → 409。
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

describe('Agent 每用户 ≤1', () => {
  it('第一次创建 Agent → 201', async () => {
    const { token } = await createUser(ctx.db, { role: 'user' })
    const res = await ctx.app.request('/api/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '我的助手' }),
    })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.name).toBe('我的助手')
  })

  it('🔴 同用户第二次创建 Agent → 409', async () => {
    const { token } = await createUser(ctx.db, { role: 'user' })
    // 第一次
    await ctx.app.request('/api/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A' }),
    })
    // 第二次 → 409
    const res = await ctx.app.request('/api/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'B' }),
    })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error.code).toBe('CONFLICT')
  })

  it('不同用户各自可创建 1 个 Agent', async () => {
    const u1 = await createUser(ctx.db, { role: 'user' })
    const u2 = await createUser(ctx.db, { role: 'user' })

    const r1 = await ctx.app.request('/api/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${u1.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'u1助手' }),
    })
    expect(r1.status).toBe(201)

    const r2 = await ctx.app.request('/api/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${u2.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'u2助手' }),
    })
    expect(r2.status).toBe(201)
  })
})
