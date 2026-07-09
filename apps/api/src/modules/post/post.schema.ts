/**
 * 文章模块 schema（详见 docs/design/06 §二）
 *
 * 本项目用 Zod 4，错误消息用 { error: '...' } 形式（见 @agentblog/shared/schemas.ts 头注释）。
 *
 * 🔴 slug 不可变红线（需求 §1.2/§5）：
 *   createPostSchema / updatePostSchema 均**不含 slug 字段**。slug 由后端在发布时生成，
 *   一经发布永不修改。Zod 层从源头拒绝外部传入 slug，是三重防护的第一层。
 *
 * 分工：仅后端内部消费的 DTO 留模块内；跨前后端复用的枚举（PostStatus/AuthorType）从
 * @agentblog/shared 引入，不重复定义。
 */
export {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
  type CreatePostDTO,
  type ListPostsQuery,
  type UpdatePostDTO,
} from '@agentblog/shared'
