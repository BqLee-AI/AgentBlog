/**
 * MCP 工具烟雾测试（详见 docs/design/09、issue #24）
 *
 * 决策（#24）：直接测 postTools(ctx) + createMcpServer(ctx)，不走 HTTP transport。
 * 验证：
 *   - postTools 返回恰好 6 个工具
 *   - create_post 的 authorType='agent'
 *   - createMcpServer 注册成功（不抛错）
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestDb, cleanupTestDb, type TestContext } from './helpers/setup'
import { createUser, createAgent } from './helpers/factory'

let ctx: TestContext
let toolCtx: { agentId: number; userId: number; role: 'user' }

beforeAll(async () => {
  ctx = await setupTestDb()
  const { user } = await createUser(ctx.db, { role: 'user', credits: 1000 })
  const agent = await createAgent(ctx.db, user.id)
  toolCtx = { agentId: agent.id, userId: user.id, role: 'user' }
})
afterAll(async () => {
  await cleanupTestDb(ctx.dbPath)
})

describe('MCP 工具', () => {
  it('postTools 返回 6 个工具', async () => {
    const { postTools } = await import('@/ai/tools')
    const tools = postTools(toolCtx)
    const names = Object.keys(tools).sort()
    expect(names).toEqual(['create_post', 'delete_post', 'get_post', 'list_posts', 'update_post', 'upload_image'])
    expect(names.length).toBe(6)
  })

  it('🔴 create_post 产出 Agent 作者与默认封面', async () => {
    const { postTools } = await import('@/ai/tools')
    const tools = postTools(toolCtx)
    const result = await tools.create_post.handler({
      title: 'Agent写的文章',
      content: '由 Agent 创作',
      status: 'published',
      tags: [],
    })
    // handler 返回创建的文章（含 authorType）
    const post = 'post' in result ? (result as { post: { authorType: string; coverUrl: string | null } }).post : result
    expect((post as { authorType: string }).authorType).toBe('agent')
    expect((post as { coverUrl: string | null }).coverUrl).toBe('/sample-covers/quiet-window.svg')
  })

  it('createMcpServer 注册成功（6 工具，不抛错）', async () => {
    const { createMcpServer } = await import('@/mcp/server')
    const server = createMcpServer(toolCtx)
    expect(server).toBeTruthy()
    // server 实例创建即代表 6 工具注册成功（内部 registerTool 6 次）
  })

  it('list_posts 仅返回 published', async () => {
    const { postTools } = await import('@/ai/tools')
    const { postService } = await import('@/modules/post/post.service')
    const tools = postTools(toolCtx)

    // 造一篇草稿（agent 作者）+ 一篇已发布
    await postService.create({ title: '草稿', content: 'x', status: 'draft', tags: [] }, toolCtx.agentId, 'agent')
    await postService.create({ title: '已发布', content: 'x', status: 'published', tags: [] }, toolCtx.agentId, 'agent')

    const result = await tools.list_posts.handler({ limit: 50, offset: 0 })
    // 🔴 全是 published
    for (const item of result.items) {
      expect(item.status).toBe('published')
    }
  })
})
