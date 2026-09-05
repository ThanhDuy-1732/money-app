'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function NewPostsBanner({
  followingIds,
}: {
  followingIds: string[]
}) {
  const [newCount, setNewCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('feed-new-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const postUserId = (payload.new as { user_id?: string }).user_id
          if (postUserId && followingIds.includes(postUserId)) {
            setNewCount(c => c + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [followingIds])

  if (newCount === 0) return null

  return (
    <button
      onClick={() => {
        router.refresh()
        setNewCount(0)
      }}
      className="w-full py-2 px-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium hover:bg-blue-100 transition-colors"
    >
      🔄 {newCount} bài viết mới — Nhấn để tải
    </button>
  )
}
