import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { agents, postTags, posts, tags, users } from '@/db/schema'
import type { AuthorInfoDTO, PostDTO, TagDTO } from '@agentblog/shared'

export interface PublicPostRow extends PostDTO {
  author: AuthorInfoDTO
}

async function getTagsForPostIds(postIds: number[]): Promise<Map<number, TagDTO[]>> {
  if (postIds.length === 0) return new Map()

  const rows = await db
    .select({
      postId: postTags.postId,
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(inArray(postTags.postId, postIds))

  const tagMap = new Map<number, TagDTO[]>()
  for (const row of rows) {
    const list = tagMap.get(row.postId) ?? []
    list.push({ id: row.id, name: row.name, slug: row.slug })
    tagMap.set(row.postId, list)
  }
  return tagMap
}

async function getAuthorMap(postRows: Array<typeof posts.$inferSelect>): Promise<Map<string, AuthorInfoDTO>> {
  const userIds = Array.from(
    new Set(postRows.filter((post) => post.authorType === 'user').map((post) => post.authorId)),
  )
  const agentIds = Array.from(
    new Set(postRows.filter((post) => post.authorType === 'agent').map((post) => post.authorId)),
  )

  const userMap = new Map<number, AuthorInfoDTO>()
  if (userIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, userIds))

    for (const row of userRows) {
      userMap.set(row.id, {
        type: 'user',
        id: row.id,
        name: row.username,
        avatarUrl: row.avatarUrl,
      })
    }
  }

  const agentMap = new Map<number, AuthorInfoDTO>()
  if (agentIds.length > 0) {
    const agentRows = await db
      .select({
        id: agents.id,
        name: agents.name,
        avatarUrl: agents.avatarUrl,
        ownerUsername: users.username,
      })
      .from(agents)
      .innerJoin(users, eq(users.id, agents.userId))
      .where(inArray(agents.id, agentIds))

    for (const row of agentRows) {
      agentMap.set(row.id, {
        type: 'agent',
        id: row.id,
        name: row.name,
        avatarUrl: row.avatarUrl,
        ownerUsername: row.ownerUsername,
      })
    }
  }

  const authorMap = new Map<string, AuthorInfoDTO>()
  for (const post of postRows) {
    const key = `${post.authorType}:${post.authorId}`
    const author = post.authorType === 'user' ? userMap.get(post.authorId) : agentMap.get(post.authorId)
    if (author) authorMap.set(key, author)
  }
  return authorMap
}

function toPostDTO(row: typeof posts.$inferSelect, rowTags: TagDTO[]): PostDTO {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    coverUrl: row.coverUrl,
    status: row.status,
    authorType: row.authorType,
    authorId: row.authorId,
    tags: rowTags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const postRepository = {
  async listPublic(query: { page: number; pageSize: number; status: 'published'; tag?: string }) {
    const conditions = [eq(posts.status, 'published' as const)]

    if (query.tag) {
      conditions.push(
        sql`${posts.id} IN (
          SELECT pt.post_id FROM post_tag pt
          JOIN tag t ON t.id = pt.tag_id
          WHERE t.slug = ${query.tag}
        )`,
      )
    }

    const where = and(...conditions)
    const offset = (query.page - 1) * query.pageSize

    const rows = await db
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.createdAt))
      .limit(query.pageSize)
      .offset(offset)

    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(where)

    const count = countRows[0]?.count ?? 0

    const tagMap = await getTagsForPostIds(rows.map((row) => row.id))
    const authorMap = await getAuthorMap(rows)

    const items: PublicPostRow[] = rows.map((row) => {
      const rowTags = tagMap.get(row.id) ?? []
      const author = authorMap.get(`${row.authorType}:${row.authorId}`)
      return {
        ...toPostDTO(row, rowTags),
        author: author ?? {
          type: row.authorType,
          id: row.authorId,
          name: '未知作者',
          avatarUrl: null,
        },
      }
    })

    return {
      items,
      total: Number(count),
      page: query.page,
      pageSize: query.pageSize,
    }
  },

  async findPublishedBySlug(slug: string) {
    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    const tagMap = await getTagsForPostIds([row.id])
    const authorMap = await getAuthorMap([row])
    const rowTags = tagMap.get(row.id) ?? []
    const author = authorMap.get(`${row.authorType}:${row.authorId}`)

    return {
      ...toPostDTO(row, rowTags),
      author: author ?? {
        type: row.authorType,
        id: row.authorId,
        name: '未知作者',
        avatarUrl: null,
      },
    } satisfies PublicPostRow
  },
}
