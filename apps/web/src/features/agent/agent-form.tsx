import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import {
  AgentStatus,
  updateAgentSchema,
  type CreateAgentDTO,
  type UpdateAgentDTO,
} from '@agentblog/shared'
import type { AgentDTO } from '@agentblog/shared'
import { createAgentSchema } from '@/api/agents.api'
import { ImageUpload } from '@/components/image-upload'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { setServerErrors } from '@/lib/set-server-errors'

interface AgentFormProps {
  initialValues?: AgentDTO | null
  submitting?: boolean
  submitLabel: string
  onSubmit: (values: CreateAgentDTO | UpdateAgentDTO) => Promise<void> | void
}

type AgentFormValues = z.input<typeof createAgentSchema>

function toFormValues(agent?: AgentDTO | null): CreateAgentDTO {
  return {
    name: agent?.name ?? '',
    avatarUrl: agent?.avatarUrl ?? undefined,
    systemPrompt: agent?.systemPrompt ?? undefined,
    status: agent?.status ?? AgentStatus.ACTIVE,
  }
}

export function AgentForm({
  initialValues,
  submitting,
  submitLabel,
  onSubmit,
}: AgentFormProps) {
  const form = useForm<AgentFormValues, unknown, CreateAgentDTO>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: toFormValues(initialValues),
  })

  useEffect(() => {
    form.reset(toFormValues(initialValues))
  }, [form, initialValues])

  const avatarUrl = form.watch('avatarUrl')
  const systemPrompt = form.watch('systemPrompt')

  const handleSubmit = async (values: CreateAgentDTO) => {
    const dto = initialValues
      ? updateAgentSchema.parse({
          name: values.name,
          status: values.status,
          avatarUrl: values.avatarUrl ?? null,
          systemPrompt: values.systemPrompt?.trim() ? values.systemPrompt : null,
        })
      : createAgentSchema.parse({
          name: values.name,
          status: values.status,
          ...(values.avatarUrl ? { avatarUrl: values.avatarUrl } : {}),
          ...(values.systemPrompt?.trim() ? { systemPrompt: values.systemPrompt } : {}),
        })

    try {
      await onSubmit(dto)
    } catch (err) {
      setServerErrors(form, err)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent 名称</FormLabel>
              <FormControl>
                <Input placeholder="例如：写作助手" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Agent 头像</FormLabel>
          <ImageUpload
            purpose="avatar"
            hint="建议上传方形头像，便于后台和文章归属展示"
            {...(avatarUrl ? { value: avatarUrl } : {})}
            onChange={(url) =>
              form.setValue('avatarUrl', url || undefined, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          />
          <p className="text-sm text-muted-foreground">
            头像只保存 URL，不在前端持久化额外运行时数据。
          </p>
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>状态</FormLabel>
              <FormControl>
                <select
                  className="field-surface flex h-11 w-full px-4 py-2 text-sm"
                  value={field.value ?? AgentStatus.ACTIVE}
                  onChange={(event) =>
                    field.onChange(event.target.value as CreateAgentDTO['status'])
                  }
                >
                  <option value={AgentStatus.ACTIVE}>启用</option>
                  <option value={AgentStatus.DISABLED}>停用</option>
                </select>
              </FormControl>
              <FormDescription>停用后，在线对话和 API Key 通道都不能再使用该 Agent。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt</FormLabel>
              <FormControl>
                <textarea
                  className="field-surface min-h-48 w-full px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="定义你的 Agent 擅长什么、如何回答、应遵守哪些边界。"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormDescription>
                留空则使用默认提示词。当前 {systemPrompt?.length ?? 0} / 8000 字符。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? '保存中…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
