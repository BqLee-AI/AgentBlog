/**
 * drizzle-kit 配置
 *
 * ⚠️ casing 必须与 src/db/client.ts 一致（'snake_case'），
 * 否则生成的迁移 SQL 列名不转换，导致 insert/update 类型与表结构错位。
 */
import { defineConfig } from 'drizzle-kit'
import { env } from './src/config/env'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  casing: 'snake_case',
  dbCredentials: { url: env.DATABASE_URL },
})
