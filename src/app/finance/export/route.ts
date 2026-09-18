import { NextRequest, NextResponse } from 'next/server'
import { listTransactions } from '@/features/finance/transaction.actions'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'
import { buildCsvString } from '@/features/finance/export.actions'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinanceReportPdf } from '@/features/finance/components/FinanceReportPdf'

export async function GET(req: NextRequest) {
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    return NextResponse.json({ error: 'premium_required' }, { status: 403 })
  }

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const format = req.nextUrl.searchParams.get('format') ?? 'csv'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !['csv', 'pdf'].includes(format)) {
    return NextResponse.json({ error: 'invalid_export_request' }, { status: 400 })
  }
  const { transactions, totalIncome, totalExpense } = await listTransactions(month)

  if (format === 'pdf') {
    const buffer = await renderToBuffer(
      FinanceReportPdf({ transactions, totalIncome, totalExpense, month })
    )
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bao-cao-${month}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  }

  const csv = buildCsvString(transactions)
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bao-cao-${month}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
