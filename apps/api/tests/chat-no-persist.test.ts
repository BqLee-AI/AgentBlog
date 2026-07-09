/**
 * 🔴 在线对话不落库测试（详见 docs/design/10、issue #24 红线）
 *
 * 需求 §1.2/§5 强约束：在线对话流不落库，不写 message/conversation 表。
 *
 * 策略（issue #24 决策：只测前置校验，不打真实 LLM）：
 *   - 前置校验拦截：无 token→401、余额0→402、无 Agent→400（这些在 runAgentStream 之前，不触发 LLM）
 *   - 🔴 落库验证：断言 schema 无 message/conversation/chat_session 表；
 *     触发前置拒绝的请求后，DB 各表无对话内容写入。
 *
 * 运行：bun test apps/api/tests/chat-no-persist.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { sql } from 'drizzle-orm'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser, createAgent } from './helpers/factory'

let ctx: TestContext

beforeAll(async () => {
  ctx = await setupTestDb()
})

afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('🔴 在线对话不落库', () => {
  it('🔴 schema 无 message / conversation / chat_session 表', async () => {
    // 查 sqlite_master 取所有表名
    const tables = await ctx.db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`)
    const names = tables.map((t) => (t as { name: string }).name)

    // 7 张业务表（user/agent/api_key/post/tag/post_tag/credit_log）+ drizzle 迁移表
    expect(names).toContain('user')
    expect(names).toContain('credit_log')
    // 🔴 绝无对话相关表
    expect(names).not.toContain('message')
    expect(names).not.toContain('conversation')
    expect(names).not.toContain('chat_session')
    expect(names).not.toContain('chat_message')
    expect(names).not.toContain('messages')
  })

  it('无 token → 401（authMiddleware 拦截，不进业务）', async () => {
    const res = await ctx.app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(res.status).toBe(401)
  })

  it('余额 0 → 402（流前预检拒绝，不触发 LLM）', async () => {
    const { user, token } = await createUser(ctx.db, { credits: 0 })
    const res = await ctx.app.request('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error.code).toBe('INSUFFICIENT_CREDITS')
  })

  it('有余额但无 Agent → 400（流前拒绝，不触发 LLM）', async () => {
    const { user, token } = await createUser(ctx.db, { credits: 100 })
    void user
    const res = await ctx.app.request('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.message).toContain('Agent')
  })

  it('Agent disabled → 403', async () => {
    const { user, token } = await createUser(ctx.db, { credits: 100 })
    await createAgent(ctx.db, user.id, { status: 'disabled' })
    const res = await ctx.app.request('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(res.status).toBe(403)
  })

  it('🔴 前置拒绝后 DB 无对话内容写入', async () => {
    const { creditLogs } = await import('@/db/schema')
    // 触发一次 402 拒绝
    const { token } = await createUser(ctx.db, { credits: 0 })
    await ctx.app.request('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '秘密内容' }] }),
    })

    // 🔴 查所有表，无任何行含对话内容「秘密内容」
    const allTables = await ctx.db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`)
    for (const t of allTables) {
      const name = (t as { name: string }).name
      if (name.startsWith('__') || name.startsWith('sqlite_')) continue
      const rows = (await ctx.db.all(sql`SELECT * FROM ${sql.identifier(name)}`)) as Record<string, unknown>[]
      for (const row of rows) {
        // 逐行序列化，不含对话内容
        expect(JSON.stringify(row)).not.toContain('秘密内容')
      }
    }
    // credit_log 表存在但不应因 chat 拒绝而写入（拒绝不扣费）
    void creditLogs
  })
})
