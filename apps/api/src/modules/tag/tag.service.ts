/**
 * 标签服务层（详见 docs/design/06 §九）
 *
 * 标签业务很薄：admin 建/删，公开读。slug 用 generateSlug(name) 保证稳定。
 * UNIQUE 约束防重名（name/slug 均 unique）：重复创建 → 409 CONFLICT。
 */
import { tagRepository } from './tag.repository'
import { generateSlug } from '@/lib/slug'
import { HttpError } from '@/lib/errors'
import type { CreateTagDTO } from '@agentblog/shared'
import type { TagRow } from './tag.repository'

export const tagService = {
  /** 列出全部标签（公开读） */
  async list(): Promise<TagRow[]> {
    return tagRepository.list()
  },

  /** 创建标签（admin+）。slug 由后端生成，不接受外部传入 */
  async create(dto: CreateTagDTO): Promise<TagRow> {
    try {
      // 直接插入，依赖 DB UNIQUE(name)/UNIQUE(slug) 防重，消除「先查后插」竞态
      const created = await tagRepository.create({
        name: dto.name,
        slug: generateSlug(dto.name),
      })
      if (!created) throw HttpError.internal('标签创建失败')
      return created
    } catch (e: unknown) {
      // SQLite UNIQUE 约束 → 409 标签已存在
      if (e instanceof Error && 'code' in e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw HttpError.conflict('标签名已存在')
      }
      throw e
    }
  },

  /** 删除标签（admin+）。不存在 → 404 */
  async delete(id: number): Promise<void> {
    const existing = await tagRepository.findById(id)
    if (!existing) throw HttpError.notFound('标签不存在')
    await tagRepository.delete(id)
  },
}
