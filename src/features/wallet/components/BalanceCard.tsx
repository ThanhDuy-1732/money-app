import { Note } from '@/components/ui/note'

export function BalanceCard({
  balance,
  streak,
  userId,
}: {
  balance: number
  streak: number
  userId: string
}) {
  return <Note points={balance} serial={userId} streak={streak} balanceTestId="balance" />
}
