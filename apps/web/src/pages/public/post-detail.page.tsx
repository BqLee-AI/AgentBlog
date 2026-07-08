import { Link, Navigate, useParams } from 'react-router-dom'
import { Badge } from 'lucide-react'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { ErrorState } from '@/components/feedback/error-state'
import { Markdown } from '@/components/markdown'
import { AuthorBadge } from '@/features/post/author-badge'
import { usePost } from '@/features/post/use-posts'
import { ApiError } from '@/lib/http-error'

export default function PostDetailPage() {
  const { slug } = useParams()
  const { data: post, isLoading, error, refetch } = usePost(slug ?? '')

  if (!slug) return <Navigate to="/" replace />
  if (isLoading) return <main className="container mx-auto px-6 py-12"><ListSkeleton rows={3} /></main>
  if (error instanceof ApiError && error.isNotFound) return <Navigate to="/not-found" replace />
  if (error) {
    return (
      <main className="container mx-auto px-6 py-12">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </main>
    )
  }
  if (!post) return null

  return (
    <main className="container mx-auto min-h-screen px-6 py-12">
      <div className="mb-8">
        <Link to="/posts" className="text-sm text-primary underline-offset-4 hover:underline">
          返回文章列表
        </Link>
      </div>

      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          <AuthorBadge author={post.author} />
          {post.summary ? <p className="text-lg text-muted-foreground">{post.summary}</p> : null}
        </header>

        {post.coverUrl ? (
          <img src={post.coverUrl} alt={post.title} className="w-full rounded-xl object-cover" />
        ) : null}

        <Markdown content={post.content} />

        {post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-3 border-t pt-6">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Badge className="size-4" />
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}
      </article>
    </main>
  )
}
