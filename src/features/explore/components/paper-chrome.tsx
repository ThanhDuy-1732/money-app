import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button, Serial, Stamp } from '@/components/ui'

export function PaperRule({
  index,
  title,
  action,
}: {
  index: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-border pb-2">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-muted-foreground">{index}</span>
        <h2 className="text-h3 font-bold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function PaperMasthead({ subtitle }: { subtitle: string }) {
  return (
    <header className="border-b-2 border-ink/80 pb-5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-micro font-bold uppercase tracking-[0.24em] text-muted-foreground">
            MoneyApp · Polymer Ledger
          </p>
          <h1 className="mt-2 text-[2.4rem] font-extrabold leading-[0.94] tracking-[-0.045em] sm:text-[3.15rem]">
            Khám phá
            <br />
            <span className="text-primary">chuyện tiền.</span>
          </h1>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <Stamp status="Hôm nay" tone="leaf" className="rotate-3" />
          <Serial value="20260042" label="Số" />
        </div>
      </div>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">{subtitle}</p>
    </header>
  )
}

export function PaperSearchForm({ q }: { q?: string }) {
  return (
    <form action="/explore" method="GET" className="mt-5">
      <div className="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-card px-4 py-2.5 transition-colors focus-within:border-primary">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          aria-label="Tìm bài viết và người dùng"
          placeholder="Tìm bài viết, người dùng…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
          /
        </kbd>
        <Button type="submit" size="sm" className="shrink-0 rounded-lg">
          Tìm
        </Button>
      </div>
    </form>
  )
}
