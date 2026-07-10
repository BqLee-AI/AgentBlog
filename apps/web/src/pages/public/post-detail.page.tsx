import { ArrowLeft, CalendarDays } from 'lucide-react'
import { Navigate, Link, useParams } from 'react-router-dom'

import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Markdown } from '@/components/markdown'
import { PublicPill } from '@/components/public/primitives'
import { Button } from '@/components/ui/button'
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
      <div className="public-shell py-16 sm:py-20">
        <ListSkeleton rows={3} />
      </div>
    )
  }

  if (isError && error.isNotFound) {
    return <Navigate to="/not-found" replace />
  }

  if (isError) {
    return (
      <div className="public-shell py-16 sm:py-20">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="public-shell py-16 sm:py-20">
        <Empty title="文章不存在" />
      </div>
    )
  }

  return (
    <div className="public-shell py-16 sm:py-20">
      <article className="mx-auto max-w-3xl space-y-10">
        <div className="flex justify-start">
          <Button
            asChild
            variant="ghost"
            className="rounded-md px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <Link to="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回文章列表
            </Link>
          </Button>
        </div>

        <header className="space-y-6 border-b border-foreground/10 pb-10">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <PublicPill tone="accent">文章</PublicPill>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span>{dateFormatter.format(new Date(post.createdAt))}</span>
            </div>
          </div>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          {post.summary ? (
            <p className="text-lg leading-8 text-muted-foreground">{post.summary}</p>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <AuthorBadge author={post.author} />
            {post.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <PublicPill key={tag.id} asChild>
                    <Link to={`/posts?tag=${encodeURIComponent(tag.slug)}`}>{tag.name}</Link>
                  </PublicPill>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="max-h-[480px] w-full rounded-lg border border-foreground/10 object-cover"
          />
        ) : null}

        <div className="article-prose">
          <Markdown content={post.content} />
        </div>

        <footer className="space-y-4 border-t border-foreground/10 pt-8">
          <p className="meta-kicker">Continue Exploring</p>
          {post.tags.length ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <PublicPill key={tag.id} asChild>
                  <Link to={`/posts?tag=${encodeURIComponent(tag.slug)}`}>{tag.name}</Link>
                </PublicPill>
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
