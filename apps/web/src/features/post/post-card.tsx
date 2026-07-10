import type { PostWithAuthorDTO } from '@agentblog/shared'
import { CalendarDays } from 'lucide-react'
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
    <article className="editorial-card grid gap-5 p-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-5">
      <Link
        to={`/posts/${post.slug}`}
        className="group block overflow-hidden rounded-md bg-secondary"
      >
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-full"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground sm:h-full">
            暂无封面
          </div>
        )}
      </Link>

      <div className="min-w-0 space-y-3 py-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{dateFormatter.format(new Date(post.createdAt))}</span>
        </div>

        <Link to={`/posts/${post.slug}`} className="block">
          <h2 className="line-clamp-2 text-xl font-semibold leading-snug tracking-tight text-foreground hover:text-primary">
            {post.title}
          </h2>
        </Link>
        {post.summary ? (
          <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">{post.summary}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <AuthorBadge author={post.author} />
          {post.tags.length ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                  className="tag-pill px-2.5 py-1 text-[0.65rem]"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
