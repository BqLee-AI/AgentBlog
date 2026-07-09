import type { PostWithAuthorDTO } from '@agentblog/shared'
import { CalendarDays, Tag as TagIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthorBadge } from '@/features/post/author-badge'

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

interface PostCardProps {
  post: PostWithAuthorDTO
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="grid gap-4 rounded-lg border bg-background p-4 transition-colors hover:border-foreground/20 sm:grid-cols-[160px_minmax(0,1fr)]">
      <Link
        to={`/posts/${post.slug}`}
        className="block overflow-hidden rounded-md bg-muted"
      >
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="h-36 w-full object-cover sm:h-full"
            loading="lazy"
          />
        ) : (
          <div className="flex h-36 items-center justify-center text-sm text-muted-foreground sm:h-full">
            暂无封面
          </div>
        )}
      </Link>

      <div className="min-w-0 space-y-3">
        <div className="space-y-2">
          <Link to={`/posts/${post.slug}`} className="block">
            <h2 className="line-clamp-2 text-xl font-semibold hover:text-primary">{post.title}</h2>
          </Link>
          {post.summary ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{post.summary}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{dateFormatter.format(new Date(post.createdAt))}</span>
          </div>
          {post.tags.length ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5" />
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                  className="rounded-full border px-2 py-0.5 hover:border-primary hover:text-primary"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <AuthorBadge author={post.author} />
      </div>
    </article>
  )
}
