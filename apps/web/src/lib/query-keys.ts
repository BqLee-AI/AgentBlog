import type { ListPostsQueryDTO } from '@agentblog/shared'

export const queryKeys = {
  posts: {
    list: (params: ListPostsQueryDTO) => ['posts', 'list', params] as const,
    detail: (slug: string) => ['posts', 'detail', slug] as const,
  },
  tags: {
    all: ['tags'] as const,
  },
} as const
