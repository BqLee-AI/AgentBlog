import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">页面不存在，或文章尚未发布。</p>
      <Link to="/">
        <Button variant="outline">返回首页</Button>
      </Link>
    </main>
  )
}
