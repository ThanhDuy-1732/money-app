import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import { PaperExplore } from '@/features/explore/components/paper-explore'
import { BentoExplore } from '@/features/explore/components/bento-explore'
import { RailsExplore } from '@/features/explore/components/rails-explore'
import { HybridExplore } from '@/features/explore/components/hybrid-explore'
import { cn } from '@/lib/cn'
import { mockExplore } from './mock'

const VARIANTS = [
  {
    id: 'hybrid',
    label: 'Hỗn hợp',
    desc: 'Hero của 03 · thân bento của 02 · rail người và quà',
  },
  {
    id: 'paper',
    label: 'Bản tin giấy',
    desc: 'Biên tập · giấy–mực · đường kẻ mảnh',
  },
  {
    id: 'bento',
    label: 'Bảng điều khiển',
    desc: 'Bento · dày thông tin · khối màu',
  },
  {
    id: 'rails',
    label: 'Khám phá cuộn',
    desc: 'Rail ngang · thẻ người · bục vinh danh',
  },
] as const

export default async function ExploreDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { v } = await searchParams
  const variant = VARIANTS.some(option => option.id === v) ? (v as string) : 'hybrid'

  return (
    <div>
      <div className="sticky top-0 z-30 mb-2 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-default px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-micro font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5" /> Demo · dữ liệu mẫu
              </p>
              <p className="mt-0.5 text-sm font-bold">4 phương án thiết kế cho /explore</p>
            </div>
            <nav className="flex flex-wrap gap-1">
              {VARIANTS.map(option => (
                <Link
                  key={option.id}
                  href={`/design/explore?v=${option.id}`}
                  aria-current={variant === option.id ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    variant === option.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </Link>
              ))}
              <Link
                href="/explore"
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Trang thật
              </Link>
            </nav>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {VARIANTS.find(option => option.id === variant)?.desc}
          </p>
        </div>
      </div>

      {variant === 'hybrid' && <HybridExplore data={mockExplore} demo />}
      {variant === 'paper' && <PaperExplore data={mockExplore} demo />}
      {variant === 'bento' && <BentoExplore data={mockExplore} demo />}
      {variant === 'rails' && <RailsExplore data={mockExplore} demo />}
    </div>
  )
}
