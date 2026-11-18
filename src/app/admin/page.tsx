import { getRevenueSummary, listRecentPayments } from '@/features/admin/actions/dashboard.actions'
import {
  Amount,
  Badge,
  EmptyState,
  Section,
  Stat,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui'

const PAYMENT_LABELS: Record<string, string> = {
  topup: 'Nạp điểm',
  subscription: 'Premium',
  shop_purchase: 'Mua hàng',
}

const STATUS: Record<string, { label: string; variant: 'leaf' | 'coin' | 'lotus' | 'neutral' }> = {
  succeeded: { label: 'Thành công', variant: 'leaf' },
  pending: { label: 'Chờ xử lý', variant: 'coin' },
  failed: { label: 'Thất bại', variant: 'lotus' },
}

export default async function AdminDashboard() {
  const [summary, payments] = await Promise.all([getRevenueSummary(), listRecentPayments()])

  return (
    <div data-testid="admin-dashboard" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Nạp điểm (VNPay)"
          value={<Amount value={summary.topup} kind="vnd" size="stat" />}
        />
        <Stat
          label="Premium"
          value={<Amount value={summary.subscription} kind="vnd" size="stat" />}
        />
        <Stat
          label="Shop VNPay"
          value={<Amount value={summary.shop} kind="vnd" size="stat" />}
        />
        <Stat
          label="Tổng doanh thu"
          value={
            <Amount
              value={summary.topup + summary.subscription + summary.shop}
              kind="vnd"
              tone="leaf"
              size="stat"
            />
          }
        />
        <Stat label="Sub đang hoạt động" value={summary.activeSubscriptions} />
      </div>

      <Section title="Giao dịch gần đây">
        {payments.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch"
            description="Giao dịch thanh toán sẽ xuất hiện ở đây."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Người dùng</TH>
                <TH>Loại</TH>
                <TH className="text-right">Số tiền</TH>
                <TH>Trạng thái</TH>
                <TH>Thời gian</TH>
              </TR>
            </THead>
            <TBody>
              {payments.map(payment => {
                const status = STATUS[payment.status] ?? {
                  label: payment.status,
                  variant: 'neutral' as const,
                }
                return (
                  <TR key={payment.id}>
                    <TD>
                      {(payment.profiles as { display_name: string } | null)?.display_name ??
                        payment.user_id.slice(0, 8)}
                    </TD>
                    <TD>{PAYMENT_LABELS[payment.payment_type] ?? payment.payment_type}</TD>
                    <TD className="text-right">
                      <Amount value={payment.amount_vnd} kind="vnd" />
                    </TD>
                    <TD>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleString('vi-VN')}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Section>
    </div>
  )
}
