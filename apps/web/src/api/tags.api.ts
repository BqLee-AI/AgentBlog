import type { CreateTagDTO, TagDTO } from '@agentblog/shared'
import { request } from '@/lib/request'

export const tagsApi = {
  /** 公开：标签列表 */
  list(signal?: AbortSignal) {
    return request<TagDTO[]>('/api/tags', signal ? { signal, public: true } : { public: true })
  },

  /** 后台：admin+ 创建标签 */
  create(dto: CreateTagDTO) {
    return request<TagDTO>('/api/tags', {
      method: 'POST',
      body: dto,
    })
  },

  /** 后台：admin+ 删除标签 */
  remove(id: number) {
    return request<{ deleted: true }>(`/api/tags/${id}`, {
      method: 'DELETE',
    })
  },
}
