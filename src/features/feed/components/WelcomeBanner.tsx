'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { Card, CardBody } from '@/components/ui'

export function WelcomeBanner() {
  const [visible, setVisible] = useState(true)
  const router = useRouter()

  function dismiss() {
    setVisible(false)
    router.replace('/feed', { scroll: false })
  }

  if (!visible) return null

  return (
    <Card tone="coin" className="animate-rise">
      <CardBody className="flex items-start gap-3 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coin/20 text-coin-deep">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Chào mừng bạn đến MoneyApp!</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Bạn vừa nhận <strong className="text-foreground">50 điểm</strong> chào mừng. Hãy đăng bài đầu tiên để nhận thêm +10 điểm!
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Đóng"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </CardBody>
    </Card>
  )
}
