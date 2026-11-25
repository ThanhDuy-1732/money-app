'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'

export function NewPostsBanner({ followingIds }: { followingIds: string[] }) {
  const [newCount, setNewCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('feed-new-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        payload => {
          const postUserId = (payload.new as { user_id?: string }).user_id
          if (postUserId && followingIds.includes(postUserId)) {
            setNewCount(c => c + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [followingIds])

  if (newCount === 0) return null

  return (
    <Button
      variant="secondary"
      size="sm"
      fullWidth
      onClick={() => {
        router.refresh()
        setNewCount(0)
      }}
      className="animate-rise group justify-center border border-primary/25"
    >
      <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
      {newCount} bài viết mới — Nhấn để tải
    </Button>
  )
}
