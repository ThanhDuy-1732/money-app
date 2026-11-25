import { Flame } from 'lucide-react'

export function FeedMasthead({ name, streak }: { name: string; streak: number }) {
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date())

  return (
    <header className="flex items-end justify-between gap-4 border-b-2 border-ink/70 pb-4">
      <div className="min-w-0">
        <p className="text-micro font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Cộng đồng · Polymer Ledger
        </p>
        <h1 className="mt-2 text-[2.15rem] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-[2.6rem]">
          Bảng tin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {name}, đây là chuyện tiền của mọi người hôm nay.
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {today}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-[11px] font-bold text-destructive">
          <Flame className="h-3.5 w-3.5" aria-hidden />
          {streak > 0 ? `${streak} ngày liên tiếp` : 'Chưa có chuỗi'}
        </span>
      </div>
    </header>
  )
}
