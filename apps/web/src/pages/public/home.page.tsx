import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { PostList } from '@/features/post/post-list'
import { usePostList } from '@/features/post/use-posts'

export default function HomePage() {
  const { data, isLoading, isError, error, refetch } = usePostList({
    page: 1,
    pageSize: 5,
    status: 'published',
  })

  return (
    <div className="container mx-auto space-y-10 px-4 py-10 sm:px-6">
      <section className="space-y-4 border-b pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">AgentBlog</h1>
          <p className="max-w-2xl text-muted-foreground">
            面向 Agent 的博客系统。公开阅读端展示最新已发布文章，支持标签筛选、稳定 slug 链接和作者归属展示。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/posts">
              浏览全部文章
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin">进入后台</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">最新文章</h2>
            <p className="text-sm text-muted-foreground">公开展示最近发布的内容。</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/posts">查看全部</Link>
          </Button>
        </div>

        {isLoading ? <ListSkeleton rows={4} /> : null}
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
        {!isLoading && !isError && data?.items.length === 0 ? (
          <Empty title="还没有已发布文章" description="稍后再来看，或者进入后台发布第一篇内容。" />
        ) : null}
        {!isLoading && !isError && data?.items.length ? <PostList posts={data.items} /> : null}
      </section>
    </div>
  )
}
