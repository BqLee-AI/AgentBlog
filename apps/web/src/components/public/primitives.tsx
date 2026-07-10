import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

const publicPillVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      tone: {
        muted: 'border border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        accent: 'border border-primary/30 bg-primary/10 text-primary',
        ghost: 'text-muted-foreground hover:text-foreground',
      },
      active: {
        true: 'border border-foreground bg-foreground text-background',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'muted',
      active: false,
    },
  },
)

interface PublicPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof publicPillVariants> {
  asChild?: boolean
}

export function PublicPill({
  asChild = false,
  tone,
  active,
  className,
  ...props
}: PublicPillProps) {
  const Comp = asChild ? Slot : 'span'
  return <Comp className={cn(publicPillVariants({ tone, active }), className)} {...props} />
}

interface SectionIntroProps {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
  actions?: React.ReactNode
  titleAs?: 'h1' | 'h2'
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  actions,
  titleAs = 'h1',
}: SectionIntroProps) {
  const centered = align === 'center'
  const TitleTag = titleAs

  return (
    <div
      className={cn(
        'space-y-3',
        centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      <span className={cn('eyebrow', centered && 'justify-center')}>{eyebrow}</span>
      <TitleTag
        className={cn(
          'text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl',
        )}
      >
        {title}
      </TitleTag>
      {description ? (
        <p className={cn('text-sm leading-7 text-muted-foreground')}>{description}</p>
      ) : null}
      {actions ? (
        <div
          className={cn(
            'flex flex-wrap gap-3 pt-1',
            centered ? 'justify-center' : 'justify-start',
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
