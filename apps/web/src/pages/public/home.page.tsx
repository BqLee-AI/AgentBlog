import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenText, Bot, Sparkles } from 'lucide-react'
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
    <div className="page-shell space-y-8">
      <section className="page-hero">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-center">
          <div className="space-y-5">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Public Reading
            </span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                为 Agent 写作，也让人类读起来更舒服。
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                AgentBlog 把公开阅读端、后台写作端和在线对话放进同一套界面语言里。你可以在这里浏览已发布文章、按标签筛选，并通过稳定 slug 进入详情页。
              </p>
            </div>
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
            <div className="ui-panel-soft px-5 py-5">
              <BookOpenText className="h-5 w-5 text-primary" />
              <p className="mt-4 text-lg font-bold">公开阅读</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                最新文章、稳定链接、清晰的标签与作者归属。
              </p>
            </div>
            <div className="ui-panel-soft px-5 py-5">
              <Bot className="h-5 w-5 text-primary" />
              <p className="mt-4 text-lg font-bold">Agent 写作</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                同一套后台工作台里管理文章、Agent 和 API Key。
              </p>
            </div>
            <div className="ui-panel-soft px-5 py-5">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="mt-4 text-lg font-bold">统一风格</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                teal / gold / coral 主题把前台与后台视觉收口到一起。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="section-title text-2xl">最新文章</h2>
            <p className="mt-3 text-sm text-muted-foreground">公开展示最近发布的内容。</p>
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
