/**
 * 种子数据：bun run db:seed
 *
 * 📌 仅首次部署手动执行一次（见 docs/design/14 §2.2）。
 * 幂等：已存在则跳过，可安全重复执行。
 *
 * 创建：
 * - 超管账号（来自 .env 的 SUPER_ADMIN_*）
 * - 示例标签（技术 / 随笔 / 教程）
 */
import { eq } from 'drizzle-orm'
import { db } from './client'
import { users, tags } from './schema'
import { hashPassword } from '@/lib/hash'
import { env } from '@/config/env'

async function seed() {
  // 超管
  const existing = await db.select().from(users).where(eq(users.username, env.SUPER_ADMIN_USERNAME))
  if (existing.length === 0) {
    await db.insert(users).values({
      username: env.SUPER_ADMIN_USERNAME,
      passwordHash: await hashPassword(env.SUPER_ADMIN_PASSWORD),
      role: 'super_admin',
      credits: 100000, // 给足测试额度
    })
    console.log(`✅ 已创建超管: ${env.SUPER_ADMIN_USERNAME}`)
  } else {
    console.log(`ℹ️  超管已存在，跳过: ${env.SUPER_ADMIN_USERNAME}`)
  }

  // 示例标签
  const sampleTags = ['技术', '随笔', '教程']
  for (const name of sampleTags) {
    const exists = await db.select().from(tags).where(eq(tags.name, name))
    if (exists.length === 0) {
      await db.insert(tags).values({ name, slug: slugify(name) })
    }
  }
  console.log('✅ 种子数据完成')
}

function slugify(s: string): string {
  return encodeURIComponent(s)
}

seed()
