/**
 * 迁移脚本：bun run db:migrate
 *
 * 幂等——drizzle 靠 __drizzle_migrations 表记录已执行迁移，重复执行只跳过。
 * 生产环境在服务启动时自动调用（见 docs/design/14 §2.2）。
 */
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { fileURLToPath } from 'node:url'
import { db } from './client'

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

migrate(db, { migrationsFolder })
console.log('✅ 数据库迁移完成')
