import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PAGINATION } from '@agentblog/shared'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { PostList } from '@/features/post/post-list'
import { usePostList } from '@/features/post/use-posts'
import { useTags } from '@/features/tag/use-tags'

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default function PostListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePositiveInt(searchParams.get('page'), PAGINATION.DEFAULT_PAGE)
  const tag = searchParams.get('tag') ?? undefined

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      ...(tag ? { tag } : {}),
      status: 'published' as const,
    }),
    [page, tag],
  )

  const { data, isLoading, error, refetch, isFetching } = usePostList(query)
  const { data: tags, isLoading: isTagsLoading } = useTags()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  const setTag = (nextTag?: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete('page')
    if (nextTag) next.set('tag', nextTag)
    else next.delete('tag')
    setSearchParams(next)
  }

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setSearchParams(next)
  }

  return (
    <main className="container mx-auto min-h-screen px-6 py-12">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">文章列表</h1>
        <p className="text-muted-foreground">公开阅读端：支持标签筛选、分页与稳定 slug 引用。</p>
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">标签筛选</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant={tag ? 'outline' : 'default'} onClick={() => setTag()}>
            全部
          </Button>
          {!isTagsLoading && tags
            ? tags.map((item) => (
                <Button
                  key={item.id}
                  variant={tag === item.slug ? 'default' : 'outline'}
                  onClick={() => setTag(item.slug)}
                >
                  {item.name}
                </Button>
              ))
            : null}
        </div>
      </section>

      {isLoading ? <ListSkeleton rows={6} /> : null}
      {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div className="space-y-8">
          <PostList
            posts={data.items}
            emptyTitle="没有找到匹配文章"
            emptyDescription={tag ? '试试切换其他标签。' : '稍后再来看看。'}
          />

          <div className="flex items-center justify-between gap-4 border-t pt-6">
            <p className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页 {isFetching && !isLoading ? '· 正在更新…' : ''}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                上一页
              </Button>
              <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                下一页
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <Link to="/" className="text-sm text-primary underline-offset-4 hover:underline">
          返回首页
        </Link>
      </div>
    </main>
  )
}
