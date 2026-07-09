/**
 * 文章数据层（详见 docs/design/02 §四 repository 职责、06 §四）
 *
 * 纯 Drizzle 查询，不含业务规则。业务（权限/slug 生成/作者归属展示）在 service。
 *
 * 依赖方向：routes → service → repository → db，不反向。
 * repository 之间不互相调用（02 §三铁律）。
 */
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { posts, postTags, tags } from '@/db/schema'
import type { ListPostsQuery } from './post.schema'

/** 文章完整列（repository 返回行含全部业务字段） */
const postColumns = {
  id: posts.id,
  title: posts.title,
  slug: posts.slug,
  summary: posts.summary,
  content: posts.content,
  coverUrl: posts.coverUrl,
  status: posts.status,
  authorType: posts.authorType,
  authorId: posts.authorId,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
} as const

export type PostRow = {
  id: number
  title: string
  slug: string | null
  summary: string | null
  content: string
  coverUrl: string | null
  status: 'draft' | 'published'
  authorType: 'user' | 'agent'
  authorId: number
  createdAt: Date
  updatedAt: Date
}

/** 标签关联查询返回的行 */
export type PostTagRow = {
  id: number
  name: string
  slug: string
}

function buildListWhere(query: {
  status?: ListPostsQuery['status']
  authorType?: ListPostsQuery['authorType']
  authorId?: ListPostsQuery['authorId']
  tag?: ListPostsQuery['tag']
}) {
  const conditions = [
    query.status ? eq(posts.status, query.status) : undefined,
    query.authorType ? eq(posts.authorType, query.authorType) : undefined,
    query.authorId ? eq(posts.authorId, query.authorId) : undefined,
    query.tag
      ? sql`${posts.id} IN (
          SELECT pt.post_id FROM ${postTags} pt
          JOIN ${tags} t ON t.id = pt.tag_id
          WHERE t.slug = ${query.tag}
        )`
      : undefined,
  ]

  return and(...conditions)
}

export const postRepository = {
  /** 按 id 查单条（后台编辑用，含草稿） */
  async findById(id: number): Promise<PostRow | null> {
    const [row] = await db.select(postColumns).from(posts).where(eq(posts.id, id)).limit(1)
    return row ?? null
  },

  /** 按 slug 查单条（阅读页 + MCP get_post 用） */
  async findBySlug(slug: string): Promise<PostRow | null> {
    const [row] = await db.select(postColumns).from(posts).where(eq(posts.slug, slug)).limit(1)
    return row ?? null
  },

  /**
   * 分页列表（按 createdAt 倒序）。
   * 条件拼装：status / authorType / authorId / tag（tag 用 post_tag JOIN tag 子查询）。
   */
  async list(query: ListPostsQuery): Promise<{ items: PostRow[]; total: number }> {
    const where = buildListWhere(query)

    const offset = (query.page - 1) * query.pageSize
    const [items, countResult] = await Promise.all([
      db.select(postColumns).from(posts).where(where).orderBy(desc(posts.createdAt)).limit(query.pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(where),
    ])

    return { items, total: countResult[0]?.count ?? 0 }
  },

  /** 真 offset/limit 语义的窗口列表（供 MCP / AI 工具用）。 */
  async listWindow(query: {
    offset: number
    limit: number
    status?: ListPostsQuery['status']
    authorType?: ListPostsQuery['authorType']
    authorId?: ListPostsQuery['authorId']
    tag?: ListPostsQuery['tag']
  }): Promise<{ items: PostRow[]; total: number }> {
    const where = buildListWhere(query)

    const [items, countResult] = await Promise.all([
      db.select(postColumns).from(posts).where(where).orderBy(desc(posts.createdAt)).limit(query.limit).offset(query.offset),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(where),
    ])

    return { items, total: countResult[0]?.count ?? 0 }
  },

  /**
   * 插入文章（slug 由 service 决定：published 时传，draft 时传 null）。
   * 纯数据层：不抛 HttpError，空结果（insert+returning 无返回，几乎不可能）返回 null，
   * 由 service 判空抛 internal（对齐 #17 user.repository 范式，doc 02 §三）。
   */
  async insert(data: typeof posts.$inferInsert): Promise<PostRow | null> {
    const [row] = await db.insert(posts).values(data).returning(postColumns)
    return row ?? null
  },

  /**
   * 创建文章 + 关联标签。
   * ⚠️ 必须在 service 的 db.transaction 内调用：内部 this.insert + this.setTags 两步，
   *    事务保证原子（bun:sqlite + WAL 下 db.transaction 回调内的 db 操作走同一连接）。
   *    事务外调用若 setTags 失败，会留下无标签的孤儿文章。
   *
   * 返回创建后的文章 + 其标签；insert 失败（理论不发生）返回 null，由 service 判空。
   * data 形参用 $inferInsert 子集（Omit tagIds 后的 posts 表字段 + 作者字段），
   * 与 Drizzle 的可选类型严格对齐（exactOptionalPropertyTypes）。
   */
  async createWithTags(
    data: Omit<typeof posts.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
    tagIds: number[],
  ): Promise<(PostRow & { tags: PostTagRow[] }) | null> {
    const post = await this.insert(data)
    if (!post) return null
    await this.setTags(post.id, tagIds)
    const tags = await this.getTags(post.id)
    return { ...post, tags }
  },

  /**
   * 更新文章。
   * ⚠️ 显式补 updatedAt（schema 未配 $onUpdate）。
   * ⚠️ 不在此处接收 slug——slug 不可变由 service 保证（update 调用方不传 slug 字段）。
   * 纯数据层：不抛 HttpError，文章不存在时返回 null，由 service 判空抛 notFound。
   */
  async update(id: number, data: Partial<typeof posts.$inferInsert>): Promise<PostRow | null> {
    const [row] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning(postColumns)
    return row ?? null
  },

  /** 删除文章（post_tag 外键 cascade，关联自动清除） */
  async delete(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id))
  },

  /**
   * 更新文章 + 全量覆盖标签。
   * ⚠️ 必须在 service 的 db.transaction 内调用：update + setTags 两步需原子。
   * @param id 文章 id
   * @param data posts 表字段（🔴 不含 slug 修改逻辑——slug 由 service 决定后传入或不传）
   * @param tagIds undefined=不动标签；数组=全量覆盖
   *
   * 文章不存在时返回 null，由 service 判空抛 notFound。
   * data 用 Partial<typeof posts.$inferInsert>，与 Drizzle 可选类型严格对齐。
   */
  async updateWithTags(
    id: number,
    data: Partial<typeof posts.$inferInsert>,
    tagIds: number[] | undefined,
  ): Promise<(PostRow & { tags: PostTagRow[] }) | null> {
    const post = await this.update(id, data)
    if (!post) return null
    if (tagIds !== undefined) {
      await this.setTags(id, tagIds)
    }
    const tags = await this.getTags(id)
    return { ...post, tags }
  },

  /**
   * 全量覆盖某文章的标签关联（先删后插）。
   * ⚠️ 必须在 service 的 db.transaction 内调用：「先删后插」若事务外执行，
   *    删成功但插失败会丢失原有关联。createWithTags / updateWithTags 已包好。
   */
  async setTags(postId: number, tagIds: number[]): Promise<void> {
    await db.delete(postTags).where(eq(postTags.postId, postId))
    if (tagIds.length) {
      await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })))
    }
  },

  /** 取某文章的标签列表（详情页展示） */
  async getTags(postId: number): Promise<PostTagRow[]> {
    return db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(tags)
      .innerJoin(postTags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, postId))
  },
}
