/**
 * 测试数据工厂（详见 docs/design/13 §三）
 *
 * 直接用 db 造数（绕过 service 的业务约束，如「每用户≤1 Agent」），
 * 返回实体 + token。供各测试文件复用。
 */
import type { DB } from '@/db/client'
import { users, agents, apiKeys } from '@/db/schema'
import { hashPassword } from '@/lib/hash'
import { signToken } from '@/lib/jwt'
import { generateApiKey, hashApiKey, keyPrefix } from '@/lib/crypto'
import type { Role } from '@agentblog/shared'

/** 创建用户，返回行 + 登录 token */
export async function createUser(
  db: DB,
  opts: { username?: string; role?: Role; credits?: number; status?: 'active' | 'disabled' } = {},
) {
  const username = opts.username ?? `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash: await hashPassword('pass1234'),
      role: opts.role ?? 'user',
      credits: opts.credits ?? 1000,
      status: opts.status ?? 'active',
    })
    .returning()
  const token = await signToken({ sub: user!.id, role: user!.role })
  return { user: user!, token }
}

/** 为用户创建 Agent（直接插库，绕过每用户≤1 约束，测试需要时可造多个） */
export async function createAgent(
  db: DB,
  userId: number,
  opts: { name?: string; status?: 'active' | 'disabled'; systemPrompt?: string } = {},
) {
  const [agent] = await db
    .insert(agents)
    .values({
      userId,
      name: opts.name ?? `agent_${userId}`,
      status: opts.status ?? 'active',
      systemPrompt: opts.systemPrompt ?? null,
    })
    .returning()
  return agent!
}

/**
 * 为 Agent 签发 API Key（直接插库）。
 * 返回 { row, plain }——plain 是明文（仅此一次），row 是库行（含 keyHash，不含明文）。
 */
export async function createApiKey(db: DB, agentId: number, opts: { name?: string } = {}) {
  const plain = generateApiKey()
  const [row] = await db
    .insert(apiKeys)
    .values({
      agentId,
      keyHash: hashApiKey(plain),
      keyPrefix: keyPrefix(plain),
      name: opts.name ?? null,
    })
    .returning()
  return { row: row!, plain }
}

/** 构造 Authorization Bearer header（+ JSON content-type） */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/** 构造 X-API-Key header（MCP 用） */
export function apiKeyHeaders(plainKey: string): Record<string, string> {
  return { 'X-API-Key': plainKey, 'Content-Type': 'application/json' }
}
