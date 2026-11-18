import { Skeleton } from '@/components/ui'

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-wide space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton variant="card" className="h-24" />
        <Skeleton variant="card" className="h-24" />
        <Skeleton variant="card" className="h-24" />
      </div>
      <Skeleton variant="row" />
      <Skeleton variant="row" />
    </div>
  )
}
