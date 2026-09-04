import { getRevenueSummary, listRecentPayments } from '@/features/admin/actions/dashboard.actions'

function VndAmount({ value }: { value: number }) {
  return <span>{value.toLocaleString('vi-VN')}đ</span>
}

export default async function AdminDashboard() {
  const [summary, payments] = await Promise.all([getRevenueSummary(), listRecentPayments()])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Nạp điểm (VNPay)', value: summary.topup },
          { label: 'Subscription', value: summary.subscription },
          { label: 'Shop VNPay', value: summary.shop },
          { label: 'Tổng', value: summary.topup + summary.subscription + summary.shop },
        ].map(({ label, value }) => (
          <div key={label} className="border rounded-xl p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-semibold mt-1"><VndAmount value={value} /></p>
          </div>
        ))}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500">Sub đang hoạt động</p>
          <p className="text-lg font-semibold mt-1">{summary.activeSubscriptions}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Giao dịch gần đây</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3">Người dùng</th>
                <th className="text-left p-3">Loại</th>
                <th className="text-right p-3">Số tiền</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-left p-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="p-3">{(p.profiles as any)?.display_name ?? p.user_id.slice(0,8)}</td>
                  <td className="p-3">{p.payment_type}</td>
                  <td className="p-3 text-right"><VndAmount value={p.amount_vnd} /></td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 text-gray-400">{new Date(p.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
