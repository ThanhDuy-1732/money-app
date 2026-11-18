import {
  Banknote,
  BookOpen,
  Car,
  Gamepad2,
  Gift,
  GraduationCap,
  House,
  Package,
  Pill,
  Plane,
  Receipt,
  Tag,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

type IconEntry = { icon: LucideIcon; name: string }

const ICONS: Record<string, IconEntry> = {
  '🍜': { icon: Utensils, name: 'utensils' },
  '🚗': { icon: Car, name: 'car' },
  '🧾': { icon: Receipt, name: 'receipt' },
  '🎮': { icon: Gamepad2, name: 'gamepad-2' },
  '💰': { icon: Banknote, name: 'banknote' },
  '📦': { icon: Package, name: 'package' },
  '🏠': { icon: House, name: 'house' },
  '💊': { icon: Pill, name: 'pill' },
  '🎓': { icon: GraduationCap, name: 'graduation-cap' },
  '✈️': { icon: Plane, name: 'plane' },
  '🎁': { icon: Gift, name: 'gift' },
  '📚': { icon: BookOpen, name: 'book-open' },
}

const FALLBACK: IconEntry = { icon: Tag, name: 'tag' }

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null
  className?: string
}) {
  const entry = (icon && ICONS[icon]) || FALLBACK
  const Icon = entry.icon

  return (
    <span
      data-icon={entry.name}
      aria-hidden
      className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center', className)}
    >
      <Icon className="h-full w-full" />
    </span>
  )
}
