import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="page-shell flex min-h-[70vh] items-center justify-center">
      <div className="page-hero flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <span className="eyebrow">404</span>
        <h1 className="text-6xl font-black text-foreground">页面不存在</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          你访问的页面可能已经移动，或者这条路径本来就不该存在。
        </p>
        <Button variant="outline" asChild>
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    </main>
  )
}
