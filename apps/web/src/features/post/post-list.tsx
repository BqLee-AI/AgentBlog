import type { PostWithAuthorDTO } from '@agentblog/shared'
import { PostCard } from '@/features/post/post-card'

interface PostListProps {
  posts: PostWithAuthorDTO[]
}

export function PostList({ posts }: PostListProps) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
