import type { PublicPostDTO } from '@agentblog/shared'
import { Empty } from '@/components/feedback/empty'
import { PostCard } from '@/features/post/post-card'

interface PostListProps {
  posts: PublicPostDTO[]
  emptyTitle?: string
  emptyDescription?: string
}

export function PostList({
  posts,
  emptyTitle = '暂无文章',
  emptyDescription = '稍后再来看看。',
}: PostListProps) {
  if (posts.length === 0) {
    return <Empty title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
