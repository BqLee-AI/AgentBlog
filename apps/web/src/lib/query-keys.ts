/**
 * 集中式 queryKey 工厂。
 *
 * 📌 所有 queryKey 必须从此取，禁止散落字符串数组——否则失效时漏 invalidate。
 * 分域组织，与 features/* 一一对应。
 */
export const queryKeys = {
  // auth
  me: ['me'] as const,

  // posts（阅读端 + 后台共用）
  posts: {
    all: ['posts'] as const,
    list: (params: Record<string, unknown>) => ['posts', 'list', params] as const,
    detail: (slug: string) => ['posts', 'detail', slug] as const,
    detailById: (id: number) => ['posts', 'by-id', id] as const,
  },

  // tags
  tags: {
    all: ['tags'] as const,
  },

  // users
  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
  },

  // agent（每用户 ≤1）
  agent: {
    mine: ['agent', 'mine'] as const,
  },

  // api keys
  apiKeys: {
    byAgent: (agentId: number) => ['api-keys', 'agent', agentId] as const,
  },

  // credits
  credits: {
    myLogs: (params: Record<string, unknown>) => ['credits', 'my-logs', params] as const,
    logs: (userId: number, params: Record<string, unknown>) =>
      ['credits', 'logs', userId, params] as const,
  },
} as const
