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
import { and, eq } from 'drizzle-orm'
import { db } from './client'
import { agents, postTags, posts, tags, users } from './schema'
import { hashPassword } from '@/lib/hash'
import { generateSlug } from '@/lib/slug'
import { env } from '@/config/env'

async function seed() {
  // 超管
  const existing = await db.select().from(users).where(eq(users.username, env.SUPER_ADMIN_USERNAME))
  let admin = existing[0]
  if (!admin) {
    await db.insert(users).values({
      username: env.SUPER_ADMIN_USERNAME,
      passwordHash: await hashPassword(env.SUPER_ADMIN_PASSWORD),
      role: 'super_admin',
      credits: 100000, // 给足测试额度
    })
    admin = (await db.select().from(users).where(eq(users.username, env.SUPER_ADMIN_USERNAME)))[0]!
    console.log(`✅ 已创建超管: ${env.SUPER_ADMIN_USERNAME}`)
  } else {
    console.log(`ℹ️  超管已存在，跳过: ${env.SUPER_ADMIN_USERNAME}`)
  }

  // 示例标签（slug 直接用原始名，便于阅读端按 ?tag=技术 精确匹配）
  const sampleTags = ['技术', '随笔', '教程']
  for (const name of sampleTags) {
    const exists = await db.select().from(tags).where(eq(tags.name, name))
    if (exists.length === 0) {
      await db.insert(tags).values({ name, slug: name })
    }
  }
  const tagRows = await db.select().from(tags)
  const tagBySlug = new Map(tagRows.map((t) => [t.slug, t]))

  // 给超管建一个 Agent（每用户 ≤1），用于验证 Agent 作者归属展示
  let agent = (await db.select().from(agents).where(eq(agents.userId, admin.id)))[0]
  if (!agent) {
    agent = (await db
      .insert(agents)
      .values({
        userId: admin.id,
        name: '小助',
        systemPrompt: '你是 AgentBlog 的写作助手。',
        status: 'active',
      })
      .returning())[0]!
    console.log(`✅ 已创建 Agent: ${agent.name}（主人：${admin.username}）`)
  } else {
    console.log(`ℹ️  Agent 已存在，跳过: ${agent.name}`)
  }

  // 示例文章：覆盖 user / agent 作者 + 标签关联，全部 published
  await ensurePost({
    title: 'AgentBlog 项目启动说明',
    summary: '面向 Agent 的博客系统，本文介绍整体架构与公开阅读端。',
    content: '# AgentBlog 项目启动说明\n\n面向 Agent 的博客系统。\n\n- 公开阅读端\n- 作者归属展示\n- 稳定 slug 引用\n\n> 本篇由超管（user）撰写。',
    authorType: 'user',
    authorId: admin.id,
    tagSlugs: ['技术', '随笔'],
  })

  await ensurePost({
    title: '我的 Agent 写的第一篇文章',
    summary: '由 Agent 代写的示例文章，用于验证作者归属中的「主人」展示。',
    content: '# 我的 Agent 写的第一篇文章\n\n本文由 Agent 撰写，用于验证阅读端作者归属展示。\n\n| 作者类型 | 展示 |\n| --- | --- |\n| user | 用户名 |\n| agent | Agent 名 + 主人 |\n\n> 本篇由 Agent「小助」撰写，主人会在详情页标注。',
    authorType: 'agent',
    authorId: agent.id,
    tagSlugs: ['技术', '教程'],
  })

  console.log('✅ 种子数据完成')

  // 工具：幂等插入 published 文章并关联标签（按 tag slug）
  async function ensurePost(input: {
    title: string
    summary: string
    content: string
    authorType: 'user' | 'agent'
    authorId: number
    tagSlugs: string[]
  }) {
    const exists = await db
      .select()
      .from(posts)
      .where(and(eq(posts.title, input.title), eq(posts.authorType, input.authorType)))
    if (exists.length > 0) {
      console.log(`ℹ️  文章已存在，跳过: ${input.title}`)
      return
    }

    const slug = generateSlug(input.title)
    const [post] = await db
      .insert(posts)
      .values({
        title: input.title,
        summary: input.summary,
        content: input.content,
        status: 'published',
        authorType: input.authorType,
        authorId: input.authorId,
        slug,
      })
      .returning()

    const tagIds = input.tagSlugs
      .map((s) => tagBySlug.get(s)?.id)
      .filter((id): id is number => typeof id === 'number')
    if (tagIds.length > 0) {
      await db.insert(postTags).values(tagIds.map((tagId) => ({ postId: post!.id, tagId })))
    }
    console.log(`✅ 已创建文章: ${input.title}（slug=${slug}）`)
  }
}

seed()
