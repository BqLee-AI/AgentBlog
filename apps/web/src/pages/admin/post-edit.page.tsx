import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { type CreatePostDTO, createPostSchema, type PostWithAuthorDTO } from '@agentblog/shared'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Empty } from '@/components/feedback/empty'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/feedback/list-skeleton'
import { ImageUpload } from '@/components/image-upload'
import { Markdown } from '@/components/markdown'
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
import {
  useCreatePost,
  usePostForEdit,
  useUpdatePost,
} from '@/features/post/use-posts'
import { useTags } from '@/features/tag/use-tags'
import { setServerErrors } from '@/lib/set-server-errors'

type PostFormInput = z.input<typeof createPostSchema>

const DEFAULT_VALUES: PostFormInput = {
  title: '',
  summary: '',
  content: '',
  coverUrl: undefined,
  status: 'draft',
  tagIds: [],
}

function toFormValues(post: PostWithAuthorDTO | undefined): PostFormInput {
  return {
    title: post?.title ?? '',
    summary: post?.summary ?? '',
    content: post?.content ?? '',
    coverUrl: post?.coverUrl ?? undefined,
    status: post?.status ?? 'draft',
    tagIds: post?.tags.map((tag) => tag.id) ?? [],
  }
}

export default function PostEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = id !== undefined
  const parsedPostId = id ? Number(id) : undefined
  const invalidPostId =
    isEdit && (!parsedPostId || !Number.isInteger(parsedPostId) || parsedPostId <= 0)
  const postId = invalidPostId ? undefined : parsedPostId

  const tagsQuery = useTags()
  const postQuery = usePostForEdit(isEdit ? postId : undefined)
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()

  const form = useForm<PostFormInput, unknown, CreatePostDTO>({
    resolver: zodResolver(createPostSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (postQuery.data) {
      form.reset(toFormValues(postQuery.data))
    }
  }, [form, postQuery.data])

  if (invalidPostId) {
    return <Navigate to="/not-found" replace />
  }

  async function handleSubmit(values: CreatePostDTO) {
    try {
      if (isEdit && postId) {
        await updatePost.mutateAsync({ id: postId, dto: values })
      } else {
        await createPost.mutateAsync(values)
      }
      navigate('/admin/posts')
    } catch (error) {
      setServerErrors(form, error)
    }
  }

  if (isEdit && postQuery.isLoading) {
    return <ListSkeleton rows={4} />
  }

  if (isEdit && postQuery.isError && postQuery.error.isNotFound) {
    return <Navigate to="/not-found" replace />
  }

  if (isEdit && postQuery.isError) {
    return <ErrorState message={postQuery.error.message} onRetry={() => void postQuery.refetch()} />
  }

  if (tagsQuery.isLoading) {
    return <ListSkeleton rows={3} />
  }

  if (tagsQuery.isError) {
    return <ErrorState message={tagsQuery.error.message} onRetry={() => void tagsQuery.refetch()} />
  }

  const selectedTagIds = form.watch('tagIds') ?? []
  const contentPreview = form.watch('content')
  const submitting = createPost.isPending || updatePost.isPending

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? '编辑文章' : '新建文章'}
        </h1>
        <p className="text-sm text-muted-foreground">
          标题、正文、封面和标签都直接写入文章契约；slug 不在表单里出现。
        </p>
      </section>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-6 rounded-xl border bg-card p-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input placeholder="给这篇文章起个名字" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>摘要</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="用 1-2 句话概括文章内容"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>正文（Markdown）</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={16}
                      className="flex min-h-[360px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="# 标题&#10;&#10;开始写正文"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中…' : '保存'}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/admin/posts">取消</Link>
              </Button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="space-y-4 rounded-xl border bg-card p-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <FormControl>
                      <select
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="draft">草稿</option>
                        <option value="published">已发布</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>封面</FormLabel>
                    <FormControl>
                      <ImageUpload
                        {...(field.value ? { value: field.value } : {})}
                        onChange={(url) => field.onChange(url || undefined)}
                        purpose="cover"
                        hint="支持 jpg/png/webp/gif"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tagIds"
                render={() => (
                  <FormItem>
                    <FormLabel>标签</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {tagsQuery.data?.length ? (
                          tagsQuery.data.map((tag) => {
                            const checked = selectedTagIds.includes(tag.id)

                            return (
                              <label
                                key={tag.id}
                                className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm"
                              >
                                <span>{tag.name}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const current = form.getValues('tagIds') ?? []
                                    form.setValue(
                                      'tagIds',
                                      checked
                                        ? current.filter((item) => item !== tag.id)
                                        : [...current, tag.id],
                                      { shouldDirty: true, shouldValidate: true },
                                    )
                                  }}
                                />
                              </label>
                            )
                          })
                        ) : (
                          <Empty
                            title="暂无标签"
                            description="先去标签管理页创建标签，再回来给文章打标。"
                            className="rounded-md border py-8"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-3 rounded-xl border bg-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground">Markdown 预览</h2>
              <div className="max-h-[420px] overflow-auto rounded-lg border bg-background p-4">
                {contentPreview ? (
                  <Markdown content={contentPreview} />
                ) : (
                  <p className="text-sm text-muted-foreground">正文内容会在这里实时预览。</p>
                )}
              </div>
            </section>
          </aside>
        </form>
      </Form>
    </div>
  )
}
