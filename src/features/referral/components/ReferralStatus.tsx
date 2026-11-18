import { Card, CardBody } from '@/components/ui'

export function ReferralStatus({ total, rewarded }: { total: number; rewarded: number }) {
  return (
    <Card>
      <CardBody className="space-y-1 pt-4">
        <p className="text-sm text-muted-foreground">
          Đã mời:{' '}
          <strong data-testid="referral-total" className="text-foreground">
            {total}
          </strong>{' '}
          người
        </p>
        <p className="text-sm text-muted-foreground">
          Đã nhận thưởng: <strong className="text-foreground">{rewarded} người</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Bạn nhận 100 điểm khi người được mời đăng bài đầu tiên.
        </p>
      </CardBody>
    </Card>
  )
}
