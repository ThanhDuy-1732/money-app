import { notFound } from 'next/navigation'
import { AppNavDemo } from './demo'

export default function ShellDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="min-h-screen">
      <AppNavDemo />
      <div className="p-6 md:pl-60 md:pt-6">
        <p className="text-sm text-muted-foreground">
          App shell demo. Trên mobile, mở “Thêm” ở thanh dưới để xem sheet.
        </p>
      </div>
    </main>
  )
}
