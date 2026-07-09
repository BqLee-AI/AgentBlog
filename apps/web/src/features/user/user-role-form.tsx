import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Role, updateUserRoleSchema, type UpdateUserRoleDTO, type UserDTO } from '@agentblog/shared'
import { useForm } from 'react-hook-form'
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
import { setServerErrors } from '@/lib/set-server-errors'

const ROLE_OPTIONS = [
  { value: Role.USER, label: '普通用户' },
  { value: Role.ADMIN, label: '管理员' },
  { value: Role.SUPER_ADMIN, label: '超级管理员' },
] as const

interface UserRoleFormProps {
  user: Pick<UserDTO, 'id' | 'username' | 'role'>
  submitting?: boolean
  onCancel?: () => void
  onSubmit: (values: UpdateUserRoleDTO) => void | Promise<void>
}

export function UserRoleForm({
  user,
  submitting,
  onCancel,
  onSubmit,
}: UserRoleFormProps) {
  const form = useForm<UpdateUserRoleDTO>({
    resolver: zodResolver(updateUserRoleSchema),
    defaultValues: { role: user.role },
  })

  useEffect(() => {
    form.reset({ role: user.role })
  }, [form, user.id, user.role])

  const nextRole = form.watch('role')

  const handleSubmit = async (values: UpdateUserRoleDTO) => {
    try {
      await onSubmit(values)
      form.reset(values)
    } catch (error) {
      setServerErrors(form, error)
    }
  }

  return (
    <div className="ui-panel space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <h3 className="section-title w-fit border-none pb-0 text-base">调整角色</h3>
        <p className="text-sm text-muted-foreground">
          仅 `super_admin` 可操作，当前目标：{user.username}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>目标角色</FormLabel>
                <FormControl>
                  <select
                    className="field-surface flex h-11 w-full px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormDescription>修改自己的角色会被后端拒绝。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || nextRole === user.role}>
              {submitting ? '保存中…' : '保存角色'}
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
