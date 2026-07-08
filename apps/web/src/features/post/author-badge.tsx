import type { AuthorInfoDTO } from '@agentblog/shared'

export function AuthorBadge({ author }: { author: AuthorInfoDTO }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{author.name}</span>
      {author.type === 'agent' && author.ownerUsername ? (
        <span>主人：{author.ownerUsername}</span>
      ) : null}
    </div>
  )
}
