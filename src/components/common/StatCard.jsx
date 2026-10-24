import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

const tones = {
  brand: 'bg-brand-50 text-brand-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  rose: 'bg-rose-50 text-rose-600',
}

export function StatCard({ label, value, hint, trend, icon: Icon, tone = 'brand', className }) {
  const TrendIcon = trend?.direction === 'down' ? TrendingDown : TrendingUp
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
        </div>
        {Icon && (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone] || tones.brand)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              trend.direction === 'down' ? 'text-rose-600' : 'text-emerald-600',
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {trend.value}
          </span>
        )}
        {hint && <span className="text-ink-400">{hint}</span>}
      </div>
    </div>
  )
}
