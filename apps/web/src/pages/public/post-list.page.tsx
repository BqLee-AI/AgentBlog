import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Hash } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
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

  function updateFilters(next: { page?: number; tag?: string | undefined }) {
    const nextParams = new URLSearchParams(searchParams)

    const nextPage = next.page ?? page
    const nextTag = next.tag === undefined ? tag : next.tag

    if (nextPage > 1) nextParams.set('page', String(nextPage))
    else nextParams.delete('page')

    if (nextTag) nextParams.set('tag', nextTag)
    else nextParams.delete('tag')

    setSearchParams(nextParams)
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-10 sm:px-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">文章列表</h1>
        <p className="text-muted-foreground">按标签筛选公开文章，使用稳定 slug 进入详情。</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span>标签筛选</span>
        </div>

        {tagsQuery.isLoading ? <ListSkeleton rows={1} className="max-w-3xl" /> : null}
        {tagsQuery.isError ? (
          <ErrorState message={tagsQuery.error.message} onRetry={() => void tagsQuery.refetch()} className="py-6" />
        ) : null}
        {!tagsQuery.isLoading && !tagsQuery.isError ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ page: 1, tag: undefined })}
            >
              全部
            </Button>
            {tagsQuery.data?.map((item) => (
              <Button
                key={item.id}
                variant={tag === item.slug ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilters({ page: 1, tag: item.slug })}
              >
                {item.name}
              </Button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {postsQuery.isLoading ? <ListSkeleton rows={5} /> : null}
        {postsQuery.isError ? (
          <ErrorState message={postsQuery.error.message} onRetry={() => void postsQuery.refetch()} />
        ) : null}
        {!postsQuery.isLoading && !postsQuery.isError && postsQuery.data?.items.length === 0 ? (
          <Empty
            title={tag ? '这个标签下还没有文章' : '还没有已发布文章'}
            description={tag ? '切换其他标签，或者稍后再来看。' : '稍后再来看，或者进入后台发布内容。'}
          />
        ) : null}
        {!postsQuery.isLoading && !postsQuery.isError && postsQuery.data?.items.length ? (
          <>
            <PostList posts={postsQuery.data.items} />
            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页，共 {postsQuery.data.total} 篇
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateFilters({ page: page - 1 })}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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

      {tag ? (
        <div className="text-sm text-muted-foreground">
          当前标签：
          <Link to={`/posts?tag=${encodeURIComponent(tag)}`} className="ml-1 font-medium text-foreground">
            {tag}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
