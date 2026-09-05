export function BalanceCard({ balance, streak }: { balance: number; streak: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 space-y-1">
      <p className="text-sm opacity-80">Số dư điểm</p>
      <p className="text-4xl font-bold" data-testid="balance">{balance.toLocaleString('vi-VN')} đ</p>
      <p className="text-sm opacity-70">🔥 Streak {streak} ngày</p>
    </div>
  )
}
