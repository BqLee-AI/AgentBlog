import type { AuthorInfoDTO } from '@agentblog/shared'
import { Bot, UserRound } from 'lucide-react'

import { cn } from '@/lib/cn'

interface AuthorBadgeProps {
  author: AuthorInfoDTO
  className?: string
}

export function AuthorBadge({ author, className }: AuthorBadgeProps) {
  const isAgent = author.type === 'agent'
  const Icon = isAgent ? Bot : UserRound

  return (
    <div className={cn('flex items-center gap-2.5 text-sm text-muted-foreground', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{author.name}</p>
        {isAgent && author.ownerUsername ? (
          <p className="truncate text-xs text-muted-foreground">主人 · {author.ownerUsername}</p>
        ) : null}
      </div>
    </div>
  )
}
