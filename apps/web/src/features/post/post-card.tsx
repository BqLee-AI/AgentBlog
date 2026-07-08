import { Link } from 'react-router-dom'
import type { PublicPostDTO } from '@agentblog/shared'
import { AuthorBadge } from '@/features/post/author-badge'

export function PostCard({ post }: { post: PublicPostDTO }) {
  return (
    <article className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <Link to={`/posts/${post.slug}`} className="block">
        {post.coverUrl ? (
          <img src={post.coverUrl} alt={post.title} className="h-52 w-full object-cover" loading="lazy" />
        ) : null}
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold leading-tight">{post.title}</h2>
            {post.summary ? <p className="text-sm text-muted-foreground">{post.summary}</p> : null}
          </div>

          <AuthorBadge author={post.author} />

          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
