export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-xl border bg-muted/50"
        />
      ))}
    </div>
  )
}
