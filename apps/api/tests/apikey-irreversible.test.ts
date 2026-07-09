/**
 * 🔴 API Key 不可逆存储测试（详见 docs/design/07 §2.1、issue #24 红线）
 *
 * 需求 §4.4「Key 值不可逆存储」。验证：
 *   - DB 只存 keyHash（SHA-256），无明文
 *   - 签发返回明文（仅此一次）
 *   - listByAgent 返回无明文、无 keyHash
 *   - validate 能用明文反查（哈希比对）
 *
 * 运行：bun test apps/api/tests/apikey-irreversible.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { eq } from 'drizzle-orm'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser, createAgent } from './helpers/factory'

let ctx: TestContext
let agentId: number
let ownerId: number

beforeAll(async () => {
  ctx = await setupTestDb()
  const { user } = await createUser(ctx.db, { role: 'user' })
  ownerId = user.id
  const agent = await createAgent(ctx.db, ownerId)
  agentId = agent.id
})

afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('🔴 API Key 不可逆存储', () => {
  it('签发返回明文 key（sk_live_ 前缀 + 48 hex）', async () => {
    const { apiKeyService } = await import('@/modules/api-key/api-key.service')
    const result = await apiKeyService.issue(agentId, '测试Key', { id: ownerId, role: 'user' })

    expect(result.key).toMatch(/^sk_live_[0-9a-f]{48}$/)
    expect(result.id).toBeTruthy()
    expect(result.keyPrefix).toMatch(/^sk_live_/)
  })

  it('🔴 DB 只存 keyHash，无明文', async () => {
    const { apiKeyService } = await import('@/modules/api-key/api-key.service')
    const { apiKeys } = await import('@/db/schema')

    const result = await apiKeyService.issue(agentId, '查库Key', { id: ownerId, role: 'user' })
    const plain = result.key

    // 查全部 api_key 行
    const allRows = await ctx.db.select().from(apiKeys)
    // 🔴 库里没有任何行的 keyHash 等于明文（存的是哈希，不是明文）
    expect(allRows.find((k) => k.keyHash === plain)).toBeUndefined()
    // 🔴 库里也没有任何字段值等于明文（逐字段扫描）
    for (const row of allRows) {
      expect(JSON.stringify(row)).not.toContain(plain)
    }
  })

  it('🔴 listByAgent 返回无明文、无 keyHash', async () => {
    const { apiKeyService } = await import('@/modules/api-key/api-key.service')
    const issued = await apiKeyService.issue(agentId, '列表Key', { id: ownerId, role: 'user' })

    const list = await apiKeyService.listByAgent(agentId)
    expect(list.length).toBeGreaterThan(0)

    for (const item of list) {
      // 🔴 DTO 字段不应含明文 key 或 keyHash
      expect(item).not.toHaveProperty('key')
      expect(item).not.toHaveProperty('keyHash')
      // 整体序列化也不含明文
      expect(JSON.stringify(item)).not.toContain(issued.key)
    }
  })

  it('validate 能用明文反查（哈希比对）', async () => {
    const { apiKeyService } = await import('@/modules/api-key/api-key.service')
    const issued = await apiKeyService.issue(agentId, '校验Key', { id: ownerId, role: 'user' })

    // 正确明文 → 反查成功
    const valid = await apiKeyService.validate(issued.key)
    expect(valid).not.toBeNull()
    expect(valid!.user.id).toBe(ownerId)
    expect(valid!.agent.id).toBe(agentId)

    // 错误明文 → null
    const invalid = await apiKeyService.validate('sk_live_wrongkey123')
    expect(invalid).toBeNull()
  })

  it('revoke 后 validate 返回 null', async () => {
    const { apiKeyService } = await import('@/modules/api-key/api-key.service')
    const issued = await apiKeyService.issue(agentId, '吊销Key', { id: ownerId, role: 'user' })

    // 吊销前能查
    expect(await apiKeyService.validate(issued.key)).not.toBeNull()

    await apiKeyService.revoke(issued.id, { id: ownerId, role: 'user' })

    // 🔴 吊销后查不到
    expect(await apiKeyService.validate(issued.key)).toBeNull()
  })

  it('revoke 改 status 而非删记录（可审计）', async () => {
    const { apiKeyService } = await import('@/modules/api-key/api-key.service')
    const { apiKeys } = await import('@/db/schema')
    const issued = await apiKeyService.issue(agentId, '审计Key', { id: ownerId, role: 'user' })

    await apiKeyService.revoke(issued.id, { id: ownerId, role: 'user' })

    // 记录仍在，status=revoked
    const [row] = await ctx.db.select().from(apiKeys).where(eq(apiKeys.id, issued.id)).limit(1)
    expect(row).toBeTruthy()
    expect(row!.status).toBe('revoked')
  })
})
