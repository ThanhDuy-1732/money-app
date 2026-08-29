import Link from 'next/link'
import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Không tìm thấy trang</h2>
        <Button asChild><Link href="/feed">Về trang chủ</Link></Button>
      </div>
    </div>
  )
}
