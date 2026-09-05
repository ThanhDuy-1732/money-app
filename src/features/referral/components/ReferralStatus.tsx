export function ReferralStatus({ total, rewarded }: { total: number; rewarded: number }) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <p className="text-sm text-gray-600">Đã mời: <strong data-testid="referral-total">{total}</strong> người</p>
      <p className="text-sm text-gray-600">Đã nhận thưởng: <strong>{rewarded} người</strong></p>
      <p className="text-xs text-gray-400">Bạn nhận 100đ khi người được mời đăng bài đầu tiên.</p>
    </div>
  )
}
