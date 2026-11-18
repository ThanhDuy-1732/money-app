import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createTransaction } from '@/features/finance/transaction.actions'
import { PageHeader } from '@/components/ui'
import { TransactionForm } from '@/features/finance/components/TransactionForm'

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .or('user_id.is.null,user_id.eq.' + user.id)
    .order('name')

  const { error } = await searchParams

  async function submit(form: FormData) {
    'use server'
    const result = await createTransaction({
      type: form.get('type'),
      amount_vnd: Number(form.get('amount_vnd')),
      category_id: form.get('category_id') || undefined,
      note: form.get('note') || undefined,
      occurred_at: form.get('occurred_at') || undefined,
    })
    if (result.error) {
      redirect(`/finance/new?error=${encodeURIComponent(result.error)}`)
    }
    redirect('/finance')
  }

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Thêm giao dịch"
        description="Ghi lại một khoản thu hoặc chi."
        backHref="/finance"
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <TransactionForm categories={categories ?? []} action={submit} />
    </main>
  )
}
