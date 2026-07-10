import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { rechargeSchema, type RechargeDTO } from '@agentblog/shared'
import type { UserDTO } from '@agentblog/shared'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { setServerErrors } from '@/lib/set-server-errors'

interface RechargeFormProps {
  targetUser: Pick<UserDTO, 'id' | 'username'>
  submitting?: boolean
  submitLabel?: string
  onCancel?: () => void
  onSubmit: (values: RechargeDTO) => void | Promise<void>
}

type RechargeFormValues = z.input<typeof rechargeSchema>

export function RechargeForm({
  targetUser,
  submitting,
  submitLabel = '确认充值',
  onCancel,
  onSubmit,
}: RechargeFormProps) {
  const form = useForm<RechargeFormValues, unknown, RechargeDTO>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      userId: targetUser.id,
      amount: 0,
      reason: '手动充值',
    },
  })

  useEffect(() => {
    form.reset({
      userId: targetUser.id,
      amount: 0,
      reason: '手动充值',
    })
  }, [form, targetUser.id])

  const handleSubmit = async (values: RechargeDTO) => {
    try {
      await onSubmit(values)
      form.reset({
        userId: targetUser.id,
        amount: 0,
        reason: values.reason,
      })
    } catch (error) {
      setServerErrors(form, error)
    }
  }

  return (
    <div className="ui-panel space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <h3 className="section-title w-fit border-none pb-0 text-base">充值额度</h3>
        <p className="text-sm text-muted-foreground">
          目标用户：{targetUser.username}（#{targetUser.id}）
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>充值额度</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="输入正整数"
                    value={field.value > 0 ? String(field.value) : ''}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === '' ? 0 : Number(event.target.value),
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>余额不足是 402，充值本身只接受正整数。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>原因</FormLabel>
                <FormControl>
                  <Input placeholder="例如：手动充值" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中…' : submitLabel}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
