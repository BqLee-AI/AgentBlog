import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { db } from '@/db/client'

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

let ready: Promise<void> | null = null

/** 测试库初始化：幂等执行迁移，保证直接 `bun test` 有表结构可用。 */
export function ensureTestDbReady(): Promise<void> {
  ready ??= Promise.resolve().then(() => {
    migrate(db, { migrationsFolder })
  })
  return ready
}
