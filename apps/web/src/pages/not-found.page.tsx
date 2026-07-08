import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">页面不存在</p>
      <Button variant="outline" asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </main>
  )
}
