import { request } from '@/lib/request'
import type { TagDTO } from '@agentblog/shared'

export const tagsApi = {
  list(signal?: AbortSignal) {
    return request<TagDTO[]>('/api/tags', {
      method: 'GET',
      ...(signal ? { signal } : {}),
      public: true,
    })
  },
}
