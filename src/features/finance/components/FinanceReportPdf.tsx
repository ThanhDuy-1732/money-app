import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { listTransactions } from '@/features/finance/transaction.actions'
import path from 'node:path'

Font.register({
  family: 'Be Vietnam Pro',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/BeVietnamPro-Regular.ttf') },
    { src: path.join(process.cwd(), 'public/fonts/BeVietnamPro-Bold.ttf'), fontWeight: 700 },
  ],
})

type Props = {
  transactions: Awaited<ReturnType<typeof listTransactions>>['transactions']
  totalIncome: number
  totalExpense: number
  month: string
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Be Vietnam Pro', fontSize: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e5e7eb', paddingVertical: 4 },
  cell: { flex: 1 },
  header: { fontWeight: 'bold', backgroundColor: '#f3f4f6', paddingVertical: 6 },
  summary: { marginTop: 16, padding: 12, backgroundColor: '#f9fafb' },
})

export function FinanceReportPdf({ transactions, totalIncome, totalExpense, month }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Báo cáo thu chi — {month}</Text>

        <View style={[s.row, s.header]}>
          <Text style={s.cell}>Ngày</Text>
          <Text style={s.cell}>Loại</Text>
          <Text style={s.cell}>Danh mục</Text>
          <Text style={Object.assign({}, s.cell, { textAlign: 'right' as const })}>Số tiền</Text>
        </View>

        {transactions.map(tx => (
          <View key={tx.id} style={s.row}>
            <Text style={s.cell}>{tx.occurred_at}</Text>
            <Text style={s.cell}>{tx.type === 'income' ? 'Thu' : 'Chi'}</Text>
            <Text style={s.cell}>{tx.categories?.name ?? '—'}</Text>
            <Text style={Object.assign({}, s.cell, { textAlign: 'right' as const })}>{fmt(tx.amount_vnd)}</Text>
          </View>
        ))}

        <View style={s.summary}>
          <Text>Tổng thu: {fmt(totalIncome)}</Text>
          <Text>Tổng chi: {fmt(totalExpense)}</Text>
          <Text>Tiết kiệm: {fmt(totalIncome - totalExpense)}</Text>
        </View>
      </Page>
    </Document>
  )
}
