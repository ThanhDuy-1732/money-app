'use client'
import { Button } from '@/components/ui'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Đã có lỗi xảy ra</h2>
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  )
}
