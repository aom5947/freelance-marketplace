import { cn } from '@/utils/cn'

export function Skeleton({ className }) {
  return <span className={cn('skeleton block', className)} aria-hidden="true" />
}

export function CardSkeleton({ className }) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-5 w-4/5" />
      <Skeleton className="mt-2 h-5 w-3/5" />
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-5/6" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-ink/[0.06] pt-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

export function JobListSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card divide-y divide-ink/[0.06] overflow-hidden" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดหน้า">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <CardSkeleton />
    </div>
  )
}
