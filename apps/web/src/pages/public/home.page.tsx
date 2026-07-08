import { Link } from 'react-router-dom'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { PostList } from '@/features/post/post-list'
import { usePostList } from '@/features/post/use-posts'

export function HomePage() {
  const { data, isLoading, error, refetch } = usePostList({ page: 1, pageSize: 6, status: 'published' })

  return (
    <main className="container mx-auto min-h-screen px-6 py-12">
      <section className="mb-10 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">AgentBlog</h1>
        <p className="max-w-2xl text-muted-foreground">
          面向 Agent 的博客系统。这里展示所有已发布文章，支持标签筛选、稳定 slug 引用与作者归属展示。
        </p>
        <Link to="/posts">
          <Button variant="outline">查看全部文章</Button>
        </Link>
      </section>

      {isLoading ? <ListSkeleton rows={6} /> : null}
      {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
      {data ? (
        <PostList
          posts={data.items}
          emptyTitle="暂无已发布文章"
          emptyDescription="稍后再来看看最新内容。"
        />
      ) : null}
    </main>
  )
}
