import { beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@/db/client'
import { agents, apiKeys, users } from '@/db/schema'
import { generateApiKey, hashApiKey, keyPrefix } from '@/lib/crypto'
import { apiKeyService } from '@/modules/api-key/api-key.service'
import { ensureTestDbReady } from './helpers/db'

const RUN_ID = Date.now().toString(36)

beforeAll(async () => {
  await ensureTestDbReady()
})

describe('apiKeyService.validate', () => {
  it('禁用用户的 API Key 应返回 null', async () => {
    const plain = generateApiKey()
    const [user] = await db
      .insert(users)
      .values({
        username: `apikey_disabled_user_${RUN_ID}`,
        passwordHash: 'hash',
        status: 'disabled',
      })
      .returning()
    const [agent] = await db
      .insert(agents)
      .values({ userId: user!.id, name: `agent_${RUN_ID}`, status: 'active' })
      .returning()

    await db.insert(apiKeys).values({
      agentId: agent!.id,
      keyHash: hashApiKey(plain),
      keyPrefix: keyPrefix(plain),
      name: 'disabled-user-key',
    })

    await expect(apiKeyService.validate(plain)).resolves.toBeNull()
  })

  it('停用 Agent 的 API Key 应返回 null', async () => {
    const plain = generateApiKey()
    const [user] = await db
      .insert(users)
      .values({
        username: `apikey_agent_user_${RUN_ID}`,
        passwordHash: 'hash',
        status: 'active',
      })
      .returning()
    const [agent] = await db
      .insert(agents)
      .values({ userId: user!.id, name: `disabled_agent_${RUN_ID}`, status: 'disabled' })
      .returning()

    await db.insert(apiKeys).values({
      agentId: agent!.id,
      keyHash: hashApiKey(plain),
      keyPrefix: keyPrefix(plain),
      name: 'disabled-agent-key',
    })

    await expect(apiKeyService.validate(plain)).resolves.toBeNull()
  })
})
