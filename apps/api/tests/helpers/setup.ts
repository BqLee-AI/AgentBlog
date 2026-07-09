/**
 * 测试夹具：独立临时 DB 隔离（详见 docs/design/13 §三、issue #24）
 *
 * 🔴 核心机制：db 是 import 时连接的模块级单例。要实现「每测试文件独立 DB」，
 *   必须在 import 任何业务模块（含间接 import @/db/client 的 app/service）之前
 *   覆盖 process.env.DATABASE_URL，再动态 import。
 *
 * 用法（测试文件 beforeAll 里）：
 *   const { app, db } = await setupTestDb()
 *
 * .env 由 bun 自动加载（提供 JWT_SECRET 等必填变量）；本函数覆盖 DATABASE_URL
 * 指向 data/test-<随机>.db，.env 中的 DATABASE_URL 不生效（代码赋值优先）。
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

/** setupTestDb 返回的测试上下文 */
export interface TestContext {
  /** Hono app（用 app.request 做接口测试，无需起端口） */
  app: import('@/app').app
  /** 独立临时 db 单例 */
  db: import('@/db/client').DB
  /** 临时 db 文件绝对路径（cleanup 用） */
  dbPath: string
}

/**
 * 建独立临时 DB 并 migrate，返回 { app, db }。
 * 必须在测试文件最先执行（beforeAll），且每文件只调一次（单例已连定）。
 */
export async function setupTestDb(): Promise<TestContext> {
  // 1. 随机临时 db 文件名（避免并发跑多文件时碰撞）
  const dbName = `test-${randomBytes(6).toString('hex')}.db`
  const dbPath = resolve(`./data/${dbName}`)
  mkdirSync(dirname(dbPath), { recursive: true })

  // 2. 在 import 业务模块前覆盖（env.ts import 时 safeParse 定型）
  process.env.DATABASE_URL = dbPath
  process.env.NODE_ENV = 'test'

  // 3. 动态 import（此时 db 单例连到上面的临时文件）
  const { db } = await import('@/db/client')
  const { app } = await import('@/app')
  const { migrate } = await import('drizzle-orm/bun-sqlite/migrator')

  // 4. 建表（drizzle migrate 幂等，靠 __drizzle_migrations 记录）
  migrate(db, { migrationsFolder: './drizzle' })

  return { app, db, dbPath }
}

/**
 * 清理临时 DB 文件（afterAll 调用）。
 * SQLite WAL 模式会产生 -wal/-shm 边车文件，一并删除。
 */
export async function cleanupTestDb(dbPath: string): Promise<void> {
  const { rm } = await import('node:fs/promises')
  await Promise.all([
    rm(dbPath, { force: true }),
    rm(`${dbPath}-wal`, { force: true }),
    rm(`${dbPath}-shm`, { force: true }),
  ]).catch(() => {})
}
