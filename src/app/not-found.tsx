import Link from 'next/link'
import { Button, EmptyState } from '@/components/ui'

export default function NotFound() {
  return (
    <main
      data-testid="not-found"
      className="mx-auto flex min-h-screen max-w-narrow items-center justify-center px-4 py-12"
    >
      <EmptyState
        title="Không tìm thấy trang"
        description="Trang bạn tìm có thể đã bị xóa hoặc đường dẫn không đúng."
        action={
          <Button asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        }
      />
    </main>
  )
}
