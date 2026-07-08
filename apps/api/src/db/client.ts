/**
 * Drizzle 客户端单例（bun:sqlite 驱动）
 *
 * - Bun 内置 sqlite，零原生依赖
 * - WAL 模式：并发读写性能更优
 * - foreign_keys ON：启用外键级联（SQLite 默认关闭）
 * - casing: 'snake_case'：schema 里写 camelCase，自动映射到 snake_case 列名
 *   ⚠️ 必须与 drizzle.config.ts 里的 casing 一致，否则迁移列名不转换
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { env } from '@/config/env'
import * as schema from './schema'

// 确保数据库文件所在目录存在（SQLite 不会自动创建目录）
const dbPath = resolve(env.DATABASE_URL)
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')

export const db = drizzle(sqlite, { schema, casing: 'snake_case' })
export type DB = typeof db
