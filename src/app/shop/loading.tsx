import { Skeleton } from '@/components/ui'

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-default space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  )
}
