import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-6xl font-bold">403</h1>
      <p className="text-muted-foreground">无权访问此页面</p>
      <Button variant="outline" asChild>
        <Link to="/admin">返回后台</Link>
      </Button>
    </main>
  )
}
