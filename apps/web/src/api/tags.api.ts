import type { TagDTO } from '@agentblog/shared'
import { request } from '@/lib/request'

export const tagsApi = {
  /** 公开：标签列表 */
  list(signal?: AbortSignal) {
    return request<TagDTO[]>('/api/tags', signal ? { signal, public: true } : { public: true })
  },
}
