import { Skeleton } from '@/components/ui'

export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-narrow space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton variant="card" className="h-28" />
      <Skeleton variant="card" className="h-40" />
      <Skeleton variant="card" className="h-40" />
    </div>
  )
}
