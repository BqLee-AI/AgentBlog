import { CalendarDays } from 'lucide-react'
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
      <div className="container mx-auto px-4 py-10 sm:px-6">
        <ListSkeleton rows={3} />
      </div>
    )
  }

  if (isError && error.isNotFound) {
    return <Navigate to="/not-found" replace />
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-10 sm:px-6">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-10 sm:px-6">
        <Empty title="文章不存在" description="你访问的内容可能尚未发布，或链接已失效。" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
            {post.summary ? <p className="text-lg text-muted-foreground">{post.summary}</p> : null}
          </div>

          <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="max-h-[420px] w-full rounded-lg object-cover"
          />
        ) : null}

        <Markdown content={post.content} />

        <footer className="space-y-3 border-t pt-4">
          <h2 className="text-sm font-medium text-muted-foreground">标签</h2>
          {post.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                  className="rounded-full border px-3 py-1 text-sm hover:border-primary hover:text-primary"
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
