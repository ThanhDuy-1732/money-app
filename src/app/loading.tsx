import { Skeleton } from '@/components/ui'

export default function Loading() {
  return (
    <div className="mx-auto max-w-narrow space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton variant="card" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
    </div>
  )
}
