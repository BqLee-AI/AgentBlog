import { ArrowLeft, CalendarDays } from 'lucide-react'
import { Navigate, Link, useParams } from 'react-router-dom'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Markdown } from '@/components/markdown'
import { AuthorBadge } from '@/features/post/author-badge'
import { usePost } from '@/features/post/use-posts'

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function PostDetailPage() {
  const { slug } = useParams()
  const { data: post, isLoading, isError, error, refetch } = usePost(slug)

  if (!slug) {
    return <Navigate to="/not-found" replace />
  }

  if (isLoading) {
    return (
      <div className="page-shell">
        <ListSkeleton rows={3} />
      </div>
    )
  }

  if (isError && error.isNotFound) {
    return <Navigate to="/not-found" replace />
  }

  if (isError) {
    return (
      <div className="page-shell">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="page-shell">
        <Empty title="文章不存在" description="你访问的内容可能尚未发布，或链接已失效。" />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <article className="ui-panel mx-auto max-w-4xl space-y-8 p-6 sm:p-8">
        <div>
          <Link to="/posts" className="ui-chip hover:-translate-y-0.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回文章列表
          </Link>
        </div>

        <header className="space-y-4">
          <div className="space-y-2">
            <span className="eyebrow">Published Story</span>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{post.title}</h1>
            {post.summary ? (
              <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {post.summary}
              </p>
            ) : null}
          </div>

          <div className="ui-panel-soft flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <AuthorBadge author={post.author} />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{dateFormatter.format(new Date(post.createdAt))}</span>
            </div>
          </div>
        </header>

        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="max-h-[460px] w-full rounded-[1.6rem] border border-primary/10 object-cover shadow-card"
          />
        ) : null}

        <div className="rounded-[1.6rem] border border-primary/10 bg-white/70 p-5 sm:p-7">
          <Markdown content={post.content} />
        </div>

        <footer className="space-y-3 border-t border-dashed border-primary/18 pt-5">
          <h2 className="text-sm font-medium text-muted-foreground">标签</h2>
          {post.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                  className="ui-chip hover:-translate-y-0.5 hover:border-primary/30"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无标签</p>
          )}
        </footer>
      </article>
    </div>
  )
}
