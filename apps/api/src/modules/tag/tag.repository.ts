/**
 * 标签数据层（详见 docs/design/02 §四 repository 职责、06 §九）
 *
 * 纯 Drizzle 查询。tag 是简单实体，无业务规则，service 很薄。
 */
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tags } from '@/db/schema'
import { HttpError } from '@/lib/errors'

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

  /** 创建标签（slug 由 service 传入） */
  async create(data: { name: string; slug: string }): Promise<TagRow> {
    const [row] = await db.insert(tags).values(data).returning(tagColumns)
    if (!row) throw HttpError.internal('标签创建失败')
    return row
  },

  /** 删除标签（post_tag 外键 cascade，文章关联自动清除） */
  async delete(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id))
  },
}
