import { cn } from '@/utils/cn'

export function CategoryChip({ active = false, onClick, children, icon: Icon, as = 'button', className, ...props }) {
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition duration-200',
    active
      ? 'border-ink bg-ink text-white shadow-sm'
      : 'border-ink/10 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700',
    className,
  )

  if (as === 'span') {
    return (
      <span className={classes} {...props}>
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {children}
      </span>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={classes} {...props}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </button>
  )
}
