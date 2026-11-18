import { cn } from '@/lib/cn'
import { Guilloche } from './guilloche'
import { SecurityThread } from './security-thread'
import { Serial } from './serial'
import { WatermarkCoin } from './watermark-coin'

export function Note({
  points,
  serial,
  streak,
  rank,
  className,
}: {
  points: number
  serial?: string
  streak?: number
  rank?: string
  className?: string
}) {
  return (
    <div
      data-testid="wallet-note"
      className={cn(
        'relative isolate overflow-hidden rounded-[22px] border border-primary/20 bg-secondary p-5 text-secondary-foreground',
        className
      )}
    >
      <Guilloche className="text-primary" />
      <SecurityThread className="absolute left-[58%] top-0 h-full -rotate-6" />
      <WatermarkCoin className="-bottom-12 -right-3" size={190} opacity={0.07} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Số dư điểm</p>
          <Serial value={serial ?? '0042 8817'} label="SỐ VÍ" className="mt-1 text-primary/70" />
        </div>
        {typeof streak === 'number' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-card/50 px-2 py-1 text-[10px] font-bold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            {streak} ngày
          </span>
        )}
      </div>

      <p className="relative z-10 mt-5 text-[46px] font-extrabold leading-none tracking-[-0.045em] text-primary">
        {points.toLocaleString('vi-VN')}
        <span className="ml-2 text-base font-bold tracking-normal text-primary/60">điểm</span>
      </p>

      <div className="relative z-10 mt-4 flex items-end justify-between gap-3">
        {rank ? (
          <span className="rounded-full border border-primary/20 bg-card/50 px-2 py-1 text-[10px] font-bold text-primary">
            {rank}
          </span>
        ) : (
          <span />
        )}
        <span className="font-mono text-[10px] tracking-[0.08em] text-primary/60">POLYMER · VND</span>
      </div>
    </div>
  )
}
