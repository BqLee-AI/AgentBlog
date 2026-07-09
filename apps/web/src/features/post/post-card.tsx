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
    <article className="ui-panel group grid gap-5 p-4 transition-all hover:-translate-y-1 hover:border-primary/20 sm:grid-cols-[190px_minmax(0,1fr)] sm:p-5">
      <Link
        to={`/posts/${post.slug}`}
        className="relative block overflow-hidden rounded-[1.4rem] border border-primary/10 bg-[rgba(232,246,245,0.72)]"
      >
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:h-full"
            loading="lazy"
          />
        ) : (
          <div className="flex h-44 items-center justify-center bg-[linear-gradient(135deg,rgba(255,248,231,0.92),rgba(232,246,245,0.96))] text-sm font-medium text-muted-foreground sm:h-full">
            暂无封面
          </div>
        )}
      </Link>

      <div className="min-w-0 space-y-4">
        <div className="space-y-3">
          <Link to={`/posts/${post.slug}`} className="block">
            <h2 className="line-clamp-2 text-xl font-bold text-foreground group-hover:text-primary">{post.title}</h2>
          </Link>
          {post.summary ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{post.summary}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="ui-chip bg-[rgba(232,246,245,0.76)]">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{dateFormatter.format(new Date(post.createdAt))}</span>
          </div>
          {post.tags.length ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5 text-primary/70" />
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                  className="ui-chip border-primary/14 bg-white/84 px-3 py-1 text-xs hover:-translate-y-0.5 hover:border-primary/30"
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
