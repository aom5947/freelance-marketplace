import { cn } from '@/utils/cn'

const tones = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200/80',
}

const dots = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  violet: 'bg-violet-500',
}

export function StatusBadge({ label, tone = 'slate', pulse = false, className, icon: Icon }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        tones[tone] || tones.slate,
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-3 w-3" aria-hidden="true" />
      ) : (
        <span className={cn('relative flex h-1.5 w-1.5 rounded-full', dots[tone] || dots.slate)}>
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-70',
                dots[tone] || dots.slate,
              )}
            />
          )}
        </span>
      )}
      {label}
    </span>
  )
}
