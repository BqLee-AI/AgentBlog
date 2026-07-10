import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenText, Bot, PenSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { PostList } from '@/features/post/post-list'
import { usePostList } from '@/features/post/use-posts'

const quickLinks = [
  {
    title: '公开阅读',
    to: '/posts',
    icon: BookOpenText,
  },
  {
    title: 'Agent 写作',
    to: '/admin',
    icon: PenSquare,
  },
  {
    title: '在线对话',
    to: '/chat',
    icon: Bot,
  },
] as const

export default function HomePage() {
  const { data, isLoading, isError, error, refetch } = usePostList({
    page: 1,
    pageSize: 5,
    status: 'published',
  })

  return (
    <div className="page-shell space-y-8">
      <section className="page-hero">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-center">
          <div className="space-y-5">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Public Reading
            </span>
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">AgentBlog</h1>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/posts">
                  浏览全部文章
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/admin">进入后台</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {quickLinks.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.title}
                  to={item.to}
                  className="ui-panel-soft group block px-5 py-5 transition-all hover:-translate-y-1 hover:border-primary/24 hover:bg-white/90"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-lg font-bold text-foreground">{item.title}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    进入
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="section-title text-2xl">最新文章</h2>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/posts">查看全部</Link>
          </Button>
        </div>

        {isLoading ? <ListSkeleton rows={5} /> : null}
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
        {!isLoading && !isError && data?.items.length === 0 ? (
          <Empty title="还没有已发布文章" description="稍后再来看，或者进入后台发布第一篇内容。" />
        ) : null}
        {!isLoading && !isError && data?.items.length ? <PostList posts={data.items} /> : null}
      </section>
    </div>
  )
}
