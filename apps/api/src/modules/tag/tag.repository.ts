/**
 * 标签数据层（详见 docs/design/02 §四 repository 职责、06 §九）
 *
 * 纯 Drizzle 查询。tag 是简单实体，无业务规则，service 很薄。
 */
import { desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { tags } from '@/db/schema'
import { generateSlug } from '@/lib/slug'

const tagColumns = {
  id: tags.id,
  name: tags.name,
  slug: tags.slug,
  createdAt: tags.createdAt,
  updatedAt: tags.updatedAt,
} as const

export type TagRow = {
  id: number
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export const tagRepository = {
  /** 列出全部标签（按 id 倒序，新建在前） */
  async list(): Promise<TagRow[]> {
    return db.select(tagColumns).from(tags).orderBy(desc(tags.id))
  },

  /** 按 slug 查（发文时校验 tagIds 存在性可用，也可供 service 校验） */
  async findBySlug(slug: string): Promise<TagRow | null> {
    const [row] = await db.select(tagColumns).from(tags).where(eq(tags.slug, slug)).limit(1)
    return row ?? null
  },

  /** 按 id 查（删除前校验存在性用） */
  async findById(id: number): Promise<TagRow | null> {
    const [row] = await db.select(tagColumns).from(tags).where(eq(tags.id, id)).limit(1)
    return row ?? null
  },

  /**
   * 创建标签（slug 由 service 传入）。
   * 纯数据层：不抛 HttpError，空结果（理论不发生）返回 null，由 service 判空（对齐 #17 范式）。
   */
  async create(data: { name: string; slug: string }): Promise<TagRow | null> {
    const [row] = await db.insert(tags).values(data).returning(tagColumns)
    return row ?? null
  },

  /** 删除标签（post_tag 外键 cascade，文章关联自动清除） */
  async delete(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id))
  },

  /**
   * 按名字批量查找或创建标签（发文时自动管理标签，大小写不敏感去重）。
   * ⚠️ 应在 post.service 的 db.transaction 内调用，保证原子。
   * - 已存在（name 大小写不敏感匹配）→ 复用
   * - 不存在 → 插入（slug 用 generateSlug(name)）
   * 返回值顺序与输入 names 顺序对齐（含重复 name 的去重）。
   */
  async findOrCreateMany(names: string[]): Promise<TagRow[]> {
    if (names.length === 0) return []
    // 大小写不敏感查询：lower(name) IN (lower(?), ...)
    const lowered = names.map((n) => n.toLowerCase())
    const existing = await db
      .select(tagColumns)
      .from(tags)
      .where(inArray(sql`lower(${tags.name})`, lowered))

    const existingByLower = new Map(existing.map((t) => [t.name.toLowerCase(), t]))
    // 按输入 names 顺序去重（保留首次出现的大小写），解析出 id
    const seen = new Set<string>()
    const result: TagRow[] = []
    for (const name of names) {
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const hit = existingByLower.get(key)
      if (hit) {
        result.push(hit)
      } else {
        // 不存在则创建（UNIQUE(name) 兜底并发，catch 后回查）
        const created = await this.create({ name, slug: generateSlug(name) })
        if (created) {
          existingByLower.set(key, created)
          result.push(created)
        }
      }
    }
    return result
  },
}
