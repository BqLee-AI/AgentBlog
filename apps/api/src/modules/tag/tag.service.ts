/**
 * 标签服务层（详见 docs/design/06 §九）
 *
 * 标签不再由用户显式管理：发文时传入标签名字符串，post.service 调
 * tagRepository.findOrCreateMany 自动 upsert（大小写不敏感去重）。
 * 本 service 仅保留 list（GET /api/tags 用）。create/delete 已移除。
 */
import { tagRepository } from './tag.repository'
import type { TagRow } from './tag.repository'

export const tagService = {
  /** 列出全部标签（公开读，供阅读页标签云） */
  async list(): Promise<TagRow[]> {
    return tagRepository.list()
  },
}
