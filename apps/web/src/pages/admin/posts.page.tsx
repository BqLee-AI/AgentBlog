import { useMemo } from 'react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Button } from '@/components/ui/button'
import { AuthorBadge } from '@/features/post/author-badge'
import { useDeletePost, usePostListAdmin } from '@/features/post/use-posts'

const PAGE_SIZE = 10

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default function AdminPostsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const deletePost = useDeletePost()

  const page = parsePositiveInt(searchParams.get('page'), 1)
  const rawStatus = searchParams.get('status')
  const status: 'draft' | 'published' | undefined =
    rawStatus === 'draft' || rawStatus === 'published' ? rawStatus : undefined

  const params = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, ...(status ? { status } : {}) }),
    [page, status],
  )

  const postsQuery = usePostListAdmin(params)
  const totalPages = postsQuery.data
    ? Math.max(1, Math.ceil(postsQuery.data.total / postsQuery.data.pageSize))
    : 1

  function updateFilters(next: { page?: number; status?: 'draft' | 'published' | undefined }) {
    const nextParams = new URLSearchParams(searchParams)
    const nextPage = next.page ?? page
    const nextStatus = next.status === undefined ? status : next.status

    if (nextPage > 1) nextParams.set('page', String(nextPage))
    else nextParams.delete('page')

    if (nextStatus) nextParams.set('status', nextStatus)
    else nextParams.delete('status')

    setSearchParams(nextParams)
  }

  async function handleDelete(id: number, title: string) {
    if (!window.confirm(`确认删除《${title}》吗？此操作无法撤销。`)) return
    await deletePost.mutateAsync(id)
  }

  return (
    <div className="space-y-6">
      <section className="page-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <span className="eyebrow">Editorial Workflow</span>
          <h1 className="text-2xl font-semibold tracking-tight">文章管理</h1>
        </div>
        <Button asChild>
          <Link to="/admin/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            新建文章
          </Link>
        </Button>
      </section>

      <section className="ui-panel-soft flex flex-wrap gap-2 px-4 py-4">
        <Button
          variant={!status ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ page: 1, status: undefined })}
        >
          全部
        </Button>
        <Button
          variant={status === 'draft' ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ page: 1, status: 'draft' })}
        >
          草稿
        </Button>
        <Button
          variant={status === 'published' ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ page: 1, status: 'published' })}
        >
          已发布
        </Button>
      </section>

      {postsQuery.isLoading ? <ListSkeleton rows={5} /> : null}
      {postsQuery.isError ? (
        <ErrorState message={postsQuery.error.message} onRetry={() => void postsQuery.refetch()} />
      ) : null}
      {!postsQuery.isLoading && !postsQuery.isError && postsQuery.data?.items.length === 0 ? (
        <Empty
          title="还没有文章"
          action={(
            <Button asChild>
              <Link to="/admin/posts/new">去写文章</Link>
            </Button>
          )}
        />
      ) : null}
      {!postsQuery.isLoading && !postsQuery.isError && postsQuery.data?.items.length ? (
        <section className="space-y-4">
          {postsQuery.data.items.map((post) => {
            const deleting = deletePost.isPending && deletePost.variables === post.id

            return (
              <article key={post.id} className="ui-panel space-y-4 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          post.status === 'published'
                            ? 'bg-[rgba(43,168,162,0.16)] text-primary'
                            : 'bg-[rgba(255,210,63,0.22)] text-[#9a6a00]'
                        }`}
                      >
                        {post.status === 'published' ? '已发布' : '草稿'}
                      </span>
                      <span className="text-xs text-muted-foreground">ID #{post.id}</span>
                      {post.slug ? (
                        <span className="text-xs text-muted-foreground">slug: {post.slug}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">未生成 slug</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">{post.title}</h2>
                      {post.summary ? (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{post.summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无摘要</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <AuthorBadge author={post.author} />
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {dateFormatter.format(new Date(post.updatedAt))}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {post.tags.length ? (
                        post.tags.map((tag) => (
                          <span key={tag.id} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">暂无标签</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/posts/${post.id}/edit`}>编辑</Link>
                    </Button>
                    {post.slug ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/posts/${encodeURIComponent(post.slug)}`}>公开页</Link>
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleting}
                      onClick={() => void handleDelete(post.id, post.title)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {deleting ? '删除中…' : '删除'}
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}

          <div className="ui-panel-soft flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页，共 {postsQuery.data.total} 篇
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: page - 1 })}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateFilters({ page: page + 1 })}
              >
                下一页
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
