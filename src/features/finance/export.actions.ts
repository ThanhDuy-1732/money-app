// Not 'use server' — buildCsvString is a pure helper exported for testing
import { listTransactions } from '@/features/finance/transaction.actions'

type Tx = Awaited<ReturnType<typeof listTransactions>>['transactions'][number]

function sanitize(v: string): string {
  // Prefix formula-triggering chars with a single quote (harmless in spreadsheets)
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v
}

function escapeCell(val: string | null | undefined): string {
  const s = sanitize(String(val ?? ''))
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsvString(transactions: Tx[]): string {
  const header = 'Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú\n'
  const rows = transactions.map(tx => [
    escapeCell(tx.occurred_at),
    escapeCell(tx.type),
    escapeCell(tx.categories?.name ?? ''),
    escapeCell(String(tx.amount_vnd)),
    escapeCell(tx.note),
  ].join(','))
  return header + rows.join('\n') + (rows.length > 0 ? '\n' : '')
}
