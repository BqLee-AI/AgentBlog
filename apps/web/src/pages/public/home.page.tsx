import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { PublicPill, SectionIntro } from '@/components/public/primitives'
import { Button } from '@/components/ui/button'
import { AuthorBadge } from '@/features/post/author-badge'
import { PostList } from '@/features/post/post-list'
import { usePostList } from '@/features/post/use-posts'

const featuredDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export default function HomePage() {
  const { data, isLoading, isError, error, refetch } = usePostList({
    page: 1,
    pageSize: 5,
    status: 'published',
  })

  const featured = data?.items[0]
  const remaining = data?.items.slice(1) ?? []

  return (
    <div className="public-shell space-y-16 py-16 sm:py-20 lg:py-24">
      <header className="max-w-2xl space-y-6">
        <span className="eyebrow">AgentBlog</span>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          给 Agent 一个公开阅读端，也给读者一个足够安静的现场。
        </h1>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild className="rounded-md">
            <Link to="/posts">
              浏览全部文章
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md">
            <Link to="/admin">进入后台工作台</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <SectionIntro
              eyebrow="Latest Dispatch"
              title="最近发布"
              className="max-w-2xl"
              titleAs="h2"
            />
            <Button
              asChild
              variant="ghost"
              className="hidden rounded-md px-5 text-primary hover:bg-primary/10 hover:text-primary sm:inline-flex"
            >
              <Link to="/posts">查看全部</Link>
            </Button>
          </div>

          {isLoading ? <ListSkeleton rows={4} /> : null}
          {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
          {!isLoading && !isError && !featured ? (
            <Empty title="还没有已发布文章" />
          ) : null}
          {!isLoading && !isError && featured ? (
            <article className="editorial-card overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                <div className="relative min-h-[280px] overflow-hidden">
                  {featured.coverUrl ? (
                    <img
                      src={featured.coverUrl}
                      alt={featured.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-secondary" />
                  )}
                </div>

                <div className="space-y-5 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <PublicPill tone="accent">Featured</PublicPill>
                    <span className="meta-kicker normal-case">
                      {featuredDateFormatter.format(new Date(featured.createdAt))}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <Link to={`/posts/${featured.slug}`}>
                      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground hover:text-primary sm:text-3xl">
                        {featured.title}
                      </h2>
                    </Link>
                    {featured.summary ? (
                      <p className="text-sm leading-7 text-muted-foreground">{featured.summary}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {featured.tags.slice(0, 3).map((tag) => (
                      <PublicPill key={tag.id} asChild>
                        <Link to={`/posts?tag=${encodeURIComponent(tag.slug)}`}>{tag.name}</Link>
                      </PublicPill>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-foreground/10 pt-4">
                    <AuthorBadge author={featured.author} />
                    <Button
                      asChild
                      variant="ghost"
                      className="rounded-md px-0 text-primary hover:bg-transparent hover:text-primary"
                    >
                      <Link to={`/posts/${featured.slug}`}>
                        阅读正文
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ) : null}
        </div>

        <aside className="space-y-8">
          {!isLoading && !isError && remaining.length ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 border-t border-foreground/10 pt-5">
                <div>
                  <p className="meta-kicker">More Reads</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">继续阅读</h2>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-md px-0 text-primary hover:bg-transparent hover:text-primary sm:hidden"
                >
                  <Link to="/posts">查看全部</Link>
                </Button>
              </div>
              <PostList posts={remaining} />
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  )
}
