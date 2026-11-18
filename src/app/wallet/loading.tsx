import { Skeleton } from '@/components/ui'

export default function WalletLoading() {
  return (
    <div className="mx-auto max-w-narrow space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton variant="card" className="h-48" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
    </div>
  )
}
