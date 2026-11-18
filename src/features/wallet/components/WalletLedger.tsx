'use client'
import { useState } from 'react'
import { Tabs } from '@/components/ui'
import { LedgerTable } from './LedgerTable'
import type { Database } from '@/lib/types/database'

type LedgerRow = Database['public']['Tables']['points_ledger']['Row']

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'in', label: 'Nhận' },
  { value: 'out', label: 'Chi' },
  { value: 'topup', label: 'Nạp' },
]

export function WalletLedger({ rows }: { rows: LedgerRow[] }) {
  const [tab, setTab] = useState('all')

  const filtered =
    tab === 'all'
      ? rows
      : tab === 'in'
        ? rows.filter(row => row.delta > 0)
        : tab === 'out'
          ? rows.filter(row => row.delta < 0)
          : rows.filter(row => row.reason_code === 'topup' || row.reason_code === 'adjustment')

  return (
    <div className="space-y-3">
      <Tabs items={TABS} value={tab} onValueChange={setTab} />
      <LedgerTable rows={filtered} />
    </div>
  )
}
