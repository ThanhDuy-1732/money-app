import Link from 'next/link'
import { verifyVNPayReturn } from '@/features/wallet/actions/topup.actions'
import { Amount, Badge, Button, Card, CardBody, Stamp } from '@/components/ui'

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function TopupReturnPage({ searchParams }: Props) {
  const params = await searchParams
  const { success, amount, mock } = await verifyVNPayReturn(params)

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-narrow items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardBody className="space-y-4 pt-6">
          <div className="flex justify-center">
            <Stamp
              status={success ? 'Đã thanh toán' : 'Chưa thanh toán'}
              tone={success ? 'leaf' : 'lotus'}
              rotate={false}
            />
          </div>

          <h1 className="text-h2 font-extrabold tracking-tight">
            {success ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
          </h1>

          {success && amount ? (
            <p className="text-sm text-muted-foreground">
              Bạn đã nạp <Amount value={amount} kind="vnd" tone="leaf" />. Điểm sẽ được cộng trong vài giây.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Giao dịch bị hủy hoặc không hợp lệ. Vui lòng thử lại.
            </p>
          )}

          {mock && <Badge variant="coin">Mock mode — chưa kết nối DB</Badge>}

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild variant="outline">
              <Link href="/wallet/topup">Nạp lại</Link>
            </Button>
            <Button asChild>
              <Link href="/wallet">Về ví</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
