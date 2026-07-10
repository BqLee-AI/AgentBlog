import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full border text-sm font-semibold tracking-[0.02em] ring-offset-background transition-all duration-200 ease-spring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-[#e6b800] bg-[linear-gradient(135deg,#ffe47a_0%,#ffd23f_44%,#e6b800_100%)] text-[#234041] shadow-accent-glow hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(255,210,63,0.42)]',
        destructive:
          'border-[#d45233] bg-[linear-gradient(135deg,#ff8a6a_0%,#ef6c4a_46%,#d45233_100%)] text-white shadow-coral-glow hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(239,108,74,0.34)]',
        outline:
          'border-primary/70 bg-white/88 text-primary shadow-teal-glow hover:-translate-y-0.5 hover:bg-[rgba(232,246,245,0.94)]',
        secondary:
          'border-transparent bg-[rgba(43,168,162,0.12)] text-primary hover:bg-[rgba(43,168,162,0.18)]',
        ghost:
          'border-transparent bg-transparent text-primary/85 hover:bg-[rgba(43,168,162,0.12)] hover:text-primary',
        link: 'border-transparent px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
