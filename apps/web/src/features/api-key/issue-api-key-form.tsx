import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { issueApiKeySchema, type IssueApiKeyDTO } from '@agentblog/shared'
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

interface IssueApiKeyFormProps {
  submitting?: boolean
  onSubmit: (values: IssueApiKeyDTO) => Promise<void> | void
}

const DEFAULT_VALUES: IssueApiKeyDTO = {}

export function IssueApiKeyForm({
  submitting,
  onSubmit,
}: IssueApiKeyFormProps) {
  const form = useForm<IssueApiKeyDTO>({
    resolver: zodResolver(issueApiKeySchema),
    defaultValues: DEFAULT_VALUES,
  })

  const handleSubmit = async (values: IssueApiKeyDTO) => {
    try {
      await onSubmit(values)
      form.reset(DEFAULT_VALUES)
    } catch (err) {
      setServerErrors(form, err)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key 名称</FormLabel>
              <FormControl>
                <Input
                  placeholder="例如：本地 MCP 调试"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value || undefined)}
                />
              </FormControl>
              <FormDescription>
                仅用于你自己识别用途。签发后的明文 key 只会展示一次。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? '签发中…' : '签发新 Key'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
