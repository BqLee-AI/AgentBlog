import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { PublicPill } from '@/components/public/primitives'
import { Button } from '@/components/ui/button'
import { PostList } from '@/features/post/post-list'
import { usePostList } from '@/features/post/use-posts'
import { useTags } from '@/features/tag/use-tags'

const PAGE_SIZE = 10

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default function PostListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parsePositiveInt(searchParams.get('page'), 1)
  const tag = searchParams.get('tag') ?? undefined

  const params = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, status: 'published' as const, ...(tag ? { tag } : {}) }),
    [page, tag],
  )

  const tagsQuery = useTags()
  const postsQuery = usePostList(params)

  const totalPages = postsQuery.data ? Math.max(1, Math.ceil(postsQuery.data.total / postsQuery.data.pageSize)) : 1

  function updateFilters(next: { page?: number; tag?: string | null }) {
    const nextParams = new URLSearchParams(searchParams)

    const nextPage = next.page ?? page
    const nextTag = Object.prototype.hasOwnProperty.call(next, 'tag')
      ? next.tag ?? undefined
      : tag

    if (nextPage > 1) nextParams.set('page', String(nextPage))
    else nextParams.delete('page')

    if (nextTag) nextParams.set('tag', nextTag)
    else nextParams.delete('tag')

    setSearchParams(nextParams)
  }

  return (
    <div className="public-shell space-y-12 py-16 sm:py-20">
      <header className="max-w-2xl space-y-4">
        <span className="eyebrow">Reading Archive</span>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          文章列表
        </h1>
      </header>

      <section className="border-b border-foreground/10 pb-6">
        <div className="flex items-center gap-2 pb-4">
          <span className="meta-kicker">标签筛选</span>
        </div>

        {tagsQuery.isLoading ? <ListSkeleton rows={1} className="max-w-3xl" /> : null}
        {tagsQuery.isError ? (
          <ErrorState message={tagsQuery.error.message} onRetry={() => void tagsQuery.refetch()} />
        ) : null}
        {!tagsQuery.isLoading && !tagsQuery.isError ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => updateFilters({ page: 1, tag: null })}>
              <PublicPill active={!tag}>全部</PublicPill>
            </button>
            {tagsQuery.data?.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateFilters({ page: 1, tag: item.slug })}
              >
                <PublicPill active={tag === item.slug}>{item.name}</PublicPill>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {tag ? `标签 · ${tag}` : '全部文章'}
          </h2>
          <p className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页，共 {postsQuery.data?.total ?? 0} 篇
          </p>
        </div>

        {postsQuery.isLoading ? <ListSkeleton rows={5} /> : null}
        {postsQuery.isError ? (
          <ErrorState message={postsQuery.error.message} onRetry={() => void postsQuery.refetch()} />
        ) : null}
        {!postsQuery.isLoading && !postsQuery.isError && postsQuery.data?.items.length === 0 ? (
          <Empty title={tag ? '这个标签下还没有文章' : '还没有已发布文章'} />
        ) : null}
        {!postsQuery.isLoading && !postsQuery.isError && postsQuery.data?.items.length ? (
          <>
            <PostList posts={postsQuery.data.items} />
            <div className="flex items-center justify-between border-t border-foreground/10 pt-6">
              <p className="text-sm text-muted-foreground">第 {page} / {totalPages} 页</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-md"
                  disabled={page <= 1}
                  onClick={() => updateFilters({ page: page - 1 })}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  className="rounded-md"
                  disabled={page >= totalPages}
                  onClick={() => updateFilters({ page: page + 1 })}
                >
                  下一页
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
