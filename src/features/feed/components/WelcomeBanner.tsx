'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function WelcomeBanner() {
  const [visible, setVisible] = useState(true)
  const router = useRouter()

  function dismiss() {
    setVisible(false)
    // Clean ?welcome=1 from URL without reload
    router.replace('/feed', { scroll: false })
  }

  if (!visible) return null

  return (
    <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
      <span className="text-2xl">🎉</span>
      <div className="flex-1">
        <p className="font-semibold text-blue-800 dark:text-blue-200">Chào mừng bạn đến MoneyApp!</p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
          Bạn vừa nhận <strong>50 điểm</strong> chào mừng. Hãy đăng bài đầu tiên để nhận thêm +10 điểm!
        </p>
      </div>
      <button onClick={dismiss} className="text-blue-400 hover:text-blue-600 text-lg leading-none" aria-label="Đóng">×</button>
    </div>
  )
}
