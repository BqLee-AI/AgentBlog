/**
 * 多态作者归属展示（详见 docs/design/06 §六、需求 §2.5）
 *
 * 需求 §2.5：Agent 发文要标注 Agent 名及其主人。
 * 返回 @agentblog/shared 的 AuthorInfoDTO 形状（契约真相源）：
 *   - type=user → { type, id, name:username, avatarUrl }
 *   - type=agent → { type, id, name:agentName, avatarUrl, ownerUsername }（反查 agent.userId → user.username）
 *
 * 📌 作者归属无外键（03 §2.1），此处按 authorType 路由查询，作者不存在时返回降级信息（不抛错，
 *    保证文章详情可用——作者可能被删但文章仍在）。
 */
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users, agents } from '@/db/schema'
import type { AuthorInfoDTO } from '@agentblog/shared'

/** 输入：文章的作者类型 + 作者 id（多态指向 user 或 agent） */
interface AuthorRef {
  authorType: 'user' | 'agent'
  authorId: number
}

/**
 * 拼装作者归属信息。在 routes 层调用（拼到响应里），不在 service 内
 * （保持 service 返回纯实体，展示层组装）。
 */
export async function withAuthor(ref: AuthorRef): Promise<AuthorInfoDTO> {
  if (ref.authorType === 'user') {
    const [u] = await db
      .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, ref.authorId))
      .limit(1)
    // 作者不存在时返回降级信息（文章仍可展示）
    return {
      type: 'user',
      id: ref.authorId,
      name: u?.username ?? '未知用户',
      avatarUrl: u?.avatarUrl ?? null,
    }
  }

  // agent：取 agent 名 + 头像，并反查其主人的用户名
  const [a] = await db
    .select({ id: agents.id, name: agents.name, avatarUrl: agents.avatarUrl, userId: agents.userId })
    .from(agents)
    .where(eq(agents.id, ref.authorId))
    .limit(1)

  let ownerUsername: string | undefined
  if (a) {
    const [owner] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, a.userId))
      .limit(1)
    ownerUsername = owner?.username
  }

  return {
    type: 'agent',
    id: ref.authorId,
    name: a?.name ?? '未知 Agent',
    avatarUrl: a?.avatarUrl ?? null,
    // 仅当能查到主人时才填；shared 的 AuthorInfoDTO.ownerUsername 为 optional
    ...(ownerUsername !== undefined ? { ownerUsername } : {}),
  }
}
