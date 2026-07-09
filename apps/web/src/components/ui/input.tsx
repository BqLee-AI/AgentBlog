import * as React from 'react'

import { cn } from '@/lib/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * Input —— shadcn 标准文本输入。
 *
 * 与 RHF 配合时用 <FormField render={({field}) => <Input {...field} />} />，
 * 非受控由 RHF 管理（见 docs/design/frontend/05 §一）。
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'field-surface flex h-11 w-full px-4 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
