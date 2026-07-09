import { zodResolver } from '@hookform/resolvers/zod'
import { type CreateTagDTO, createTagSchema } from '@agentblog/shared'
import { useForm } from 'react-hook-form'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCreateTag, useDeleteTag, useTags } from '@/features/tag/use-tags'
import { setServerErrors } from '@/lib/set-server-errors'

export default function AdminTagsPage() {
  const tagsQuery = useTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()

  const form = useForm<CreateTagDTO>({
    resolver: zodResolver(createTagSchema),
    defaultValues: { name: '' },
  })

  async function handleSubmit(values: CreateTagDTO) {
    try {
      await createTag.mutateAsync(values)
      form.reset({ name: '' })
    } catch (error) {
      setServerErrors(form, error)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`确认删除标签「${name}」吗？这会影响已关联的文章标签展示。`)) return
    await deleteTag.mutateAsync(id)
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">标签管理</h1>
        <p className="text-sm text-muted-foreground">
          标签可公开读取，但创建和删除只开放给 admin+。
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标签名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：技术、教程、随笔" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={createTag.isPending}>
              {createTag.isPending ? '创建中…' : '创建标签'}
            </Button>
          </form>
        </Form>
      </section>

      {tagsQuery.isLoading ? <ListSkeleton rows={4} /> : null}
      {tagsQuery.isError ? (
        <ErrorState message={tagsQuery.error.message} onRetry={() => void tagsQuery.refetch()} />
      ) : null}
      {!tagsQuery.isLoading && !tagsQuery.isError && tagsQuery.data?.length === 0 ? (
        <Empty title="还没有标签" description="创建后即可在文章表单中多选使用。" />
      ) : null}
      {!tagsQuery.isLoading && !tagsQuery.isError && tagsQuery.data?.length ? (
        <section className="space-y-3">
          {tagsQuery.data.map((tag) => {
            const deleting = deleteTag.isPending && deleteTag.variables === tag.id

            return (
              <article key={tag.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="font-medium">{tag.name}</h2>
                  <p className="text-sm text-muted-foreground">slug: {tag.slug}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  onClick={() => void handleDelete(tag.id, tag.name)}
                >
                  {deleting ? '删除中…' : '删除'}
                </Button>
              </article>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
