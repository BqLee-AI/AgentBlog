import { beforeAll, describe, expect, it } from 'bun:test'
import { Role } from '@agentblog/shared'
import { db } from '@/db/client'
import { postTags, posts, tags } from '@/db/schema'
import { postTools } from '@/ai/tools'
import { ensureTestDbReady } from './helpers/db'

const RUN_ID = Date.now().toString(36)

beforeAll(async () => {
  await ensureTestDbReady()
})

describe('postTools.list_posts', () => {
  it('按真实 offset/limit 返回窗口数据', async () => {
    const tagSlug = `offset-tag-${RUN_ID}`
    const [tag] = await db
      .insert(tags)
      .values({ name: `Offset Tag ${RUN_ID}`, slug: tagSlug })
      .returning()

    const base = Date.now()
    const createdPosts = []
    for (let index = 0; index < 6; index += 1) {
      const createdAt = new Date(base + index * 1000)
      const [post] = await db
        .insert(posts)
        .values({
          title: `offset-post-${index}-${RUN_ID}`,
          slug: `offset-post-${index}-${RUN_ID}`,
          summary: null,
          content: `content-${index}`,
          coverUrl: null,
          status: 'published',
          authorType: 'user',
          authorId: 1,
          createdAt,
          updatedAt: createdAt,
        })
        .returning()
      createdPosts.push(post!)
    }

    await db.insert(postTags).values(createdPosts.map((post) => ({ postId: post.id, tagId: tag!.id })))

    const tools = postTools({ agentId: 1, userId: 1, role: Role.USER })
    const result = await tools.list_posts.handler({ limit: 2, offset: 3, tag: tagSlug })

    expect(result.total).toBe(6)
    expect(result.items.map((item) => item.title)).toEqual([
      `offset-post-2-${RUN_ID}`,
      `offset-post-1-${RUN_ID}`,
    ])
  })
})
