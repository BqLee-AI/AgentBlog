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
    <div className={`inline-flex items-center gap-3 rounded-full border border-primary/12 bg-white/78 px-3 py-2 text-sm text-muted-foreground shadow-sm ${className ?? ''}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(43,168,162,0.18),rgba(255,210,63,0.22))] text-primary">
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
