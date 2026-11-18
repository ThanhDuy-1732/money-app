import Link from 'next/link'
import { getFinanceTrend } from '@/features/finance/actions/trend.actions'
import { TrendChart } from '@/features/finance/components/TrendChart'
import { Amount, Button, Card, CardBody, PageHeader, Stat, Stamp } from '@/components/ui'

export default async function TrendsPage() {
  const result = await getFinanceTrend(6)

  if ('error' in result && result.error === 'premium_required') {
    return (
      <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
        <PageHeader
          title="Xu hướng tài chính"
          description="Phân tích thu chi 6 tháng."
          backHref="/finance"
        />
        <Card tone="coin" className="relative overflow-hidden">
          <CardBody className="space-y-4 pt-5 text-center">
            <div className="flex justify-center">
              <Stamp status="Premium" tone="coin" />
            </div>
            <h2 className="text-h2 font-extrabold tracking-tight">
              Mở khóa xu hướng tài chính
            </h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Xem thu chi 6 tháng, tiết kiệm ròng và xu hướng của bạn.
            </p>
            <Button asChild variant="coin">
              <Link href="/billing/upgrade">Nâng cấp Premium</Link>
            </Button>
          </CardBody>
        </Card>
      </main>
    )
  }

  if ('error' in result) {
    return (
      <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
        <PageHeader title="Xu hướng tài chính" backHref="/finance" />
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {result.error}
        </p>
      </main>
    )
  }

  const netTotal = result.reduce((sum, row) => sum + row.net, 0)

  return (
    <main className="mx-auto max-w-wide space-y-6 px-4 py-6">
      <PageHeader
        title="Xu hướng tài chính"
        description="6 tháng gần nhất."
        backHref="/finance"
      />

      <Card>
        <CardBody className="pt-4">
          <TrendChart data={result} />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Tiết kiệm ròng (6 tháng)"
          value={
            <Amount
              value={netTotal}
              kind="vnd"
              sign={netTotal >= 0 ? 'plus' : 'minus'}
              tone={netTotal >= 0 ? 'leaf' : 'lotus'}
              size="lg"
            />
          }
        />
        <Stat label="Số tháng có dữ liệu" value={result.length} />
      </div>
    </main>
  )
}
