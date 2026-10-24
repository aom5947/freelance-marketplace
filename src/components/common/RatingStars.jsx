import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'

const sizes = { xs: 'h-3 w-3', sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }

export function RatingStars({ rating = 0, count, size = 'sm', showValue = false, className }) {
  const percentage = Math.max(0, Math.min(100, (Number(rating) / 5) * 100))
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex" role="img" aria-label={`คะแนน ${Number(rating).toFixed(1)} จาก 5`}>
        <span className="flex gap-0.5 text-slate-200">
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} className={cn(sizes[size], 'fill-current')} aria-hidden="true" />
          ))}
        </span>
        <span
          className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} className={cn(sizes[size], 'shrink-0 fill-current')} />
          ))}
        </span>
      </span>
      {showValue && (
        <span className="text-xs font-semibold text-ink-700">{Number(rating).toFixed(1)}</span>
      )}
      {count !== undefined && <span className="text-xs text-ink-500">({count})</span>}
    </span>
  )
}
