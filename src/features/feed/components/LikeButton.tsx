'use client'
import { useState, type CSSProperties } from 'react'
import { Heart } from 'lucide-react'
import { likePost, unlikePost } from '../actions/feed.actions'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

export function LikeButton({
  postId,
  initialCount,
  initialLiked,
  demo = false,
}: {
  postId: string
  initialCount: number
  initialLiked: boolean
  demo?: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pulse, setPulse] = useState(0)
  const [floatKey, setFloatKey] = useState(0)

  async function toggle() {
    const prev = { liked, count }
    const next = !liked
    setLiked(next)
    setCount(c => c + (next ? 1 : -1))
    if (next) {
      setPulse(p => p + 1)
      setFloatKey(k => k + 1)
    }
    if (demo) return
    const result = next ? await likePost(postId) : await unlikePost(postId)
    if (result?.error) {
      setLiked(prev.liked)
      setCount(prev.count)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}
      className={cn(
        'group relative gap-1.5 rounded-full px-2.5 text-muted-foreground',
        liked && 'text-lotus hover:text-lotus'
      )}
    >
      <span data-icon="heart" className="relative inline-flex">
        <Heart
          key={`heart-${pulse}`}
          className={cn(
            'h-4 w-4 transition-transform',
            liked ? 'fill-current text-lotus' : 'group-hover:scale-110',
            liked && pulse > 0 && 'like-pop'
          )}
        />
        {liked && pulse > 0 && (
          <span
            key={`burst-${pulse}`}
            aria-hidden
            className="like-burst pointer-events-none absolute inset-0 rounded-full border-2 border-lotus/60"
          />
        )}
        {liked && floatKey > 0 && (
          <span
            key={`float-${floatKey}`}
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            <span
              className="heart-float absolute left-1/2 top-0 text-[10px] font-bold text-lotus"
              style={{ '--dx': '-13px' } as CSSProperties}
            >
              ♥
            </span>
            <span
              className="heart-float absolute left-1/2 top-0 text-[8px] font-bold text-lotus"
              style={{ '--dx': '11px', animationDelay: '80ms' } as CSSProperties}
            >
              ♥
            </span>
            <span
              className="heart-float absolute left-1/2 top-0 text-[12px] font-bold text-lotus"
              style={{ '--dx': '0px', animationDelay: '150ms' } as CSSProperties}
            >
              ♥
            </span>
          </span>
        )}
      </span>
      <span key={`count-${count}`} className="count-pop text-xs font-semibold tabular">
        {count}
      </span>
    </Button>
  )
}
