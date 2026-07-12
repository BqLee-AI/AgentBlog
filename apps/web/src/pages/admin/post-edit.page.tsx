import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { type CreatePostDTO, createPostSchema, type PostWithAuthorDTO } from '@agentblog/shared'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
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
import { setServerErrors } from '@/lib/set-server-errors'

type PostFormInput = z.input<typeof createPostSchema>

const DEFAULT_VALUES: PostFormInput = {
  title: '',
  summary: '',
  content: '',
  coverUrl: undefined,
  status: 'draft',
  tags: [],
}

function toFormValues(post: PostWithAuthorDTO | undefined): PostFormInput {
  return {
    title: post?.title ?? '',
    summary: post?.summary ?? '',
    content: post?.content ?? '',
    coverUrl: post?.coverUrl ?? undefined,
    status: post?.status ?? 'draft',
    tags: post?.tags.map((tag) => tag.name) ?? [],
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

  const postQuery = usePostForEdit(isEdit ? postId : undefined)
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()

  const [tagInput, setTagInput] = useState('')

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

  const currentTags = form.watch('tags') ?? []
  const contentPreview = form.watch('content')
  const submitting = createPost.isPending || updatePost.isPending

  return (
    <div className="space-y-6">
      <section className="page-hero space-y-2">
        <span className="eyebrow">{isEdit ? 'Edit Story' : 'New Story'}</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? '编辑文章' : '新建文章'}
        </h1>
      </section>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="ui-panel space-y-6 p-6">
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
                      className="field-surface flex w-full px-4 py-3 text-sm placeholder:text-muted-foreground/80"
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
                      className="field-surface flex min-h-[360px] w-full px-4 py-3 font-mono text-sm placeholder:text-muted-foreground/80"
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
            <section className="ui-panel space-y-4 p-6">
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
                        className="field-surface h-11 px-4 py-2 text-sm"
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
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel>标签</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {currentTags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentTags.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  form.setValue(
                                    'tags',
                                    currentTags.filter((item) => item !== name),
                                    { shouldDirty: true, shouldValidate: true },
                                  )
                                }}
                                className="field-surface flex items-center gap-1 rounded-[1.25rem] px-3 py-1 text-sm"
                              >
                                {name}
                                <span className="text-muted-foreground hover:text-foreground">×</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <Input
                          value={tagInput}
                          placeholder={currentTags.length >= 10 ? '最多 10 个标签' : '输入标签，回车添加'}
                          disabled={currentTags.length >= 10}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            event.preventDefault()
                            const value = tagInput.trim().slice(0, 30)
                            if (!value) return
                            if (currentTags.some((item) => item.toLowerCase() === value.toLowerCase())) {
                              setTagInput('')
                              return
                            }
                            form.setValue('tags', [...currentTags, value], {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            setTagInput('')
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="ui-panel space-y-3 p-6">
              <h2 className="text-sm font-medium text-muted-foreground">Markdown 预览</h2>
              <div className="max-h-[420px] overflow-auto rounded-[1.25rem] border border-primary/10 bg-white/75 p-4">
                {contentPreview ? (
                  <Markdown content={contentPreview} />
                ) : null}
              </div>
            </section>
          </aside>
        </form>
      </Form>
    </div>
  )
}
