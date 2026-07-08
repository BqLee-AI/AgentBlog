/**
 * LoginForm —— RHF + zod 登录表单（范式示范）。
 *
 * 这是 #6 的表单范式标杆，后续所有业务表单（发文/Agent/标签/充值/建用户）照此结构：
 *   1. schema 来自 @agentblog/shared（单一真相源，不重定义）
 *   2. zodResolver(schema) 接入 RHF
 *   3. 类型用 z.infer<typeof schema>
 *   4. <FormMessage /> 自动渲染 zod 中文错误（来自 schema 的 message）
 *   5. 提交失败时 onError 收到原始错误，内部用 setServerErrors 回填字段级错误
 *
 * 提交：onSubmit 收到的是已校验通过的 LoginDTO，由调用方（login.page.tsx）负责
 * 调 authApi.login + setAuth。
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginDTO } from '@agentblog/shared'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setServerErrors } from '@/lib/set-server-errors'

interface LoginFormProps {
  /** 校验通过后回调，返回的 Promise reject 会被 onError 收到 */
  onSubmit: (values: LoginDTO) => void | Promise<void>
  /** 提交中（外部传入，因提交逻辑在父层） */
  submitting?: boolean
  /**
   * 提交失败的副作用回调（如展示顶部全局错误）。
   * 字段级错误（VALIDATION_ERROR）由本组件内部用 setServerErrors 自动回填，
   * 这里只让父层处理非字段错误（401/5xx 等）。
   */
  onError?: (err: unknown) => void
}

export function LoginForm({ onSubmit, submitting, onError }: LoginFormProps) {
  const form = useForm<LoginDTO>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const handleSubmit = async (values: LoginDTO) => {
    try {
      await onSubmit(values)
    } catch (err) {
      // 字段级错误回填到表单（setServerErrors 内部判 isValidation）
      setServerErrors(form, err)
      // 其余错误交给父层
      onError?.(err)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="3-32 位" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="至少 6 位"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? '登录中…' : '登录'}
        </Button>
      </form>
    </Form>
  )
}
