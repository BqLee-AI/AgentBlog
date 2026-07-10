import type { PostWithAuthorDTO } from '@agentblog/shared'
import { ArrowRight, CalendarDays, Tag as TagIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthorBadge } from '@/features/post/author-badge'
import { PostCover } from '@/features/post/post-cover'

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
    <article className="ui-panel group grid gap-4 p-4 transition-all hover:-translate-y-1 hover:border-primary/20 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-stretch">
      <Link to={`/posts/${post.slug}`} className="block">
        <PostCover
          title={post.title}
          coverUrl={post.coverUrl}
          className="h-40 sm:h-full"
          imageClassName="transition-transform duration-300 group-hover:scale-[1.03]"
          titleClassName="text-lg sm:text-xl"
        />
      </Link>

      <div className="flex min-w-0 flex-col justify-between gap-3">
        <div className="space-y-2">
          <Link to={`/posts/${post.slug}`} className="block">
            <h2 className="line-clamp-2 text-xl font-bold leading-snug text-foreground group-hover:text-primary">
              {post.title}
            </h2>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <AuthorBadge author={post.author} className="max-w-full" />
          <Link
            to={`/posts/${post.slug}`}
            className="inline-flex items-center text-sm font-medium text-primary transition-transform hover:translate-x-0.5"
          >
            阅读全文
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}
