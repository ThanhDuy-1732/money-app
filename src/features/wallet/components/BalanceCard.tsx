import { Note } from '@/components/ui/note'

export function BalanceCard({ balance, streak }: { balance: number; streak: number }) {
  return (
    <Note
      points={balance}
      serial="0042 8817"
      streak={streak}
      rank="Người khai phá"
      balanceTestId="balance"
    />
  )
}
