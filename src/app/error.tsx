'use client'
import Link from 'next/link'
import { Button, EmptyState } from '@/components/ui'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-narrow items-center justify-center px-4 py-12">
      <EmptyState
        title="Có lỗi xảy ra"
        description="Thử lại, hoặc về trang chủ nếu lỗi tiếp diễn."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>Thử lại</Button>
            <Button asChild variant="outline">
              <Link href="/">Về trang chủ</Link>
            </Button>
          </div>
        }
      />
    </main>
  )
}
