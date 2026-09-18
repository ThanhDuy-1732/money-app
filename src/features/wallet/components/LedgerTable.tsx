import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import type { Database } from '@/lib/types/database'

dayjs.extend(relativeTime)
dayjs.locale('vi')

type LedgerRow = Database['public']['Tables']['points_ledger']['Row']

const REASON_LABELS: Record<string, string> = {
  signup: 'Đăng ký',
  profile_complete: 'Hoàn thiện hồ sơ',
  streak: 'Đăng nhập hàng ngày',
  post: 'Đăng bài',
  referral_in: 'Được mời',
  referral_out: 'Mời bạn thành công',
  redeem: 'Đổi điểm',
  adjustment: 'Nạp tiền',
  gift_sent: 'Tặng điểm',
  gift_received: 'Nhận điểm tặng',
}

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) return <p className="text-center text-gray-400 py-4">Chưa có giao dịch nào.</p>
  return (
    <div className="divide-y">
      {rows.map(row => (
        <div key={row.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{REASON_LABELS[row.reason_code] ?? row.reason_code}</p>
            <p className="text-xs text-gray-400">{dayjs(row.created_at).fromNow()}</p>
          </div>
          <span className={`font-semibold ${row.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {row.delta > 0 ? '+' : ''}{row.delta}đ
          </span>
        </div>
      ))}
    </div>
  )
}
