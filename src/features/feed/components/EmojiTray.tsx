'use client'
import { useState } from 'react'
import { Smile, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type EmojiGroup = {
  id: string
  label: string
  emojis: string[]
}

const GROUPS: EmojiGroup[] = [
  {
    id: 'money',
    label: 'Tiền',
    emojis: ['💰', '💸', '💵', '🪙', '💳', '🧾', '📈', '📉', '🏦', '🛒', '🧮', '💎'],
  },
  {
    id: 'life',
    label: 'Đời sống',
    emojis: ['☕', '🍜', '🍺', '🏠', '🚗', '✈️', '🎁', '🏆', '🔥', '✨', '💪', '🎯'],
  },
  {
    id: 'mood',
    label: 'Cảm xúc',
    emojis: ['😀', '😄', '😅', '😂', '🙂', '😍', '🥹', '😤', '😭', '🤔', '😴', '🤯'],
  },
  {
    id: 'work',
    label: 'Công việc',
    emojis: ['💡', '📝', '📌', '✅', '⏰', '📎', '📊', '🎉', '❤️', '👍', '🙌', '👀'],
  },
]

export function EmojiTrigger({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Chèn icon"
      aria-expanded={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        active && 'bg-muted text-foreground'
      )}
    >
      <Smile className="h-4 w-4" />
      <span className="hidden sm:inline">Icon</span>
    </button>
  )
}

export function EmojiTray({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void
  onClose: () => void
}) {
  const [group, setGroup] = useState(GROUPS[0].id)
  const activeGroup = GROUPS.find(item => item.id === group) ?? GROUPS[0]

  return (
    <div className="animate-rise rounded-lg border border-border bg-card p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {GROUPS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              aria-pressed={group === item.id}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                group === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng icon"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-8 gap-0.5 sm:grid-cols-12">
        {activeGroup.emojis.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            aria-label={`Chèn ${emoji}`}
            className="flex h-8 w-full items-center justify-center rounded-md text-lg transition-[background-color,transform] duration-150 hover:scale-110 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            {emoji}
          </button>
        ))}
      </div>

      <p className="mt-1 px-1 text-[10px] font-medium text-muted-foreground">
        Icon được chèn tại vị trí con trỏ trong nội dung.
      </p>
    </div>
  )
}
