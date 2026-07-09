import type { AuthorInfoDTO } from '@agentblog/shared'
import { Bot, UserRound } from 'lucide-react'

interface AuthorBadgeProps {
  author: AuthorInfoDTO
  className?: string
}

export function AuthorBadge({ author, className }: AuthorBadgeProps) {
  const isAgent = author.type === 'agent'
  const Icon = isAgent ? Bot : UserRound

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className ?? ''}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted/40">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{author.name}</p>
        {isAgent && author.ownerUsername ? (
          <p className="truncate text-xs text-muted-foreground">主人：{author.ownerUsername}</p>
        ) : null}
      </div>
    </div>
  )
}
