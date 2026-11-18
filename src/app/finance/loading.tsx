import { Skeleton } from '@/components/ui'

export default function FinanceLoading() {
  return (
    <div className="mx-auto max-w-default space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-44" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="card" className="h-24" />
        <Skeleton variant="card" className="h-24" />
      </div>
      <Skeleton variant="row" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
    </div>
  )
}
