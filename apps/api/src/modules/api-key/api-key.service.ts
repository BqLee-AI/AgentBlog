/**
 * API Key 服务（详见 docs/design/07 §2.3）
 *
 * 🔴 不可逆存储红线（需求 §4.4）：
 *   - DB 只存 SHA-256 哈希（hashApiKey），绝不存明文
 *   - 明文 key 仅 issue 方法的返回值中出现一次，之后再也取不到
 *   - listByAgent 只返回 keyPrefix，不返回 keyHash、不返回明文
 *
 * 校验流程（validate，供 apiKeyMiddleware 复用）：
 *   收到明文 → hashApiKey → 按 keyHash 查库 → status===active → 反查 agent → 反查 user
 */
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { apiKeys, agents, users } from '@/db/schema'
import { HttpError } from '@/lib/errors'
import { generateApiKey, hashApiKey, keyPrefix } from '@/lib/crypto'
import type { ApiKeyDTO, ApiKeyStatus } from '@agentblog/shared'
import type { Actor } from '@/modules/agent/agent.service'

/** 签发响应（🔴 明文 key 仅此返回一次） */
export interface IssueResult {
  id: number
  key: string // 明文，仅签发时返回
  keyPrefix: string
  name: string | null
}

/** validate 返回的归属信息（供 apiKeyMiddleware 注入 c.var） */
export interface ValidateResult {
  user: { id: number; username: string; credits: number }
  agent: { id: number; name: string; userId: number }
  key: { id: number }
}

/** 从 db 行映射成对外 ApiKeyDTO（createdAt 转 ISO string，🔴 不含 keyHash） */
function toApiKeyDTO(row: {
  id: number
  agentId: number
  name: string | null
  status: ApiKeyStatus
  keyPrefix: string
  createdAt: Date
}): ApiKeyDTO {
  return {
    id: row.id,
    agentId: row.agentId,
    name: row.name,
    status: row.status,
    keyPrefix: row.keyPrefix,
    createdAt: row.createdAt.toISOString(),
  }
}

export const apiKeyService = {
  /**
   * 列出某 Agent 的所有 Key（🔴 绝无明文、绝无 keyHash）。
   * 资源归属校验在调用方（agents.routes.ts）做，service 只按 agentId 查。
   */
  async listByAgent(agentId: number): Promise<ApiKeyDTO[]> {
    const rows = await db
      .select({
        id: apiKeys.id,
        agentId: apiKeys.agentId,
        name: apiKeys.name,
        status: apiKeys.status,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.agentId, agentId))

    return rows.map(toApiKeyDTO)
  },

  /**
   * 签发新 Key（🔴 明文仅返回一次）。
   * 校验 Agent 归属后生成 key → hash → 存 hash + prefix → 返回明文。
   */
  async issue(agentId: number, name: string | null, actor: Actor): Promise<IssueResult> {
    // 校验 Agent 存在 + 归属
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
    if (!agent) {
      throw HttpError.notFound('Agent 不存在')
    }
    if (agent.userId !== actor.id && actor.role === 'user') {
      throw HttpError.forbidden('无权为他人 Agent 签发 Key')
    }

    // 生成明文 → 算 hash → 存 hash + prefix（明文不入库）
    const plain = generateApiKey()
    const [row] = await db
      .insert(apiKeys)
      .values({
        agentId,
        keyHash: hashApiKey(plain),
        keyPrefix: keyPrefix(plain),
        name,
      })
      .returning()

    if (!row) throw HttpError.internal('Key 签发失败')

    // 🔴 明文 key 仅此返回一次，DB 不存明文
    return { id: row.id, key: plain, keyPrefix: row.keyPrefix, name: row.name }
  },

  /** 吊销 Key（改 status，不删记录） */
  async revoke(keyId: number, actor: Actor): Promise<void> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1)
    if (!key) {
      throw HttpError.notFound('Key 不存在')
    }

    // 反查 Agent 归属
    const [agent] = await db.select().from(agents).where(eq(agents.id, key.agentId)).limit(1)
    if (!agent || (agent.userId !== actor.id && actor.role === 'user')) {
      throw HttpError.forbidden('无权吊销他人 Key')
    }

    await db
      .update(apiKeys)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(apiKeys.id, keyId))
  },

  /**
   * MCP 鉴权用：按明文 key 查有效 Key 及其归属用户（供 apiKeyMiddleware 复用）。
   * 任一环节缺失或 status 非-active → 返回 null（中间件统一抛 401）。
   */
  async validate(plainKey: string): Promise<ValidateResult | null> {
    const hash = hashApiKey(plainKey)
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1)
    if (!key || key.status !== 'active') return null

    const [agent] = await db.select().from(agents).where(eq(agents.id, key.agentId)).limit(1)
    if (!agent) return null

    const [user] = await db.select().from(users).where(eq(users.id, agent.userId)).limit(1)
    if (!user) return null

    return {
      user: { id: user.id, username: user.username, credits: user.credits },
      agent: { id: agent.id, name: agent.name, userId: agent.userId },
      key: { id: key.id },
    }
  },
}
