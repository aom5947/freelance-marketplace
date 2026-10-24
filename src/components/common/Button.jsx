import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const variants = {
  primary:
    'bg-ink text-white shadow-[0_10px_30px_-12px_rgba(11,16,32,0.55)] hover:bg-ink-800 active:bg-ink',
  brand:
    'bg-brand-gradient text-white shadow-[0_12px_34px_-14px_rgba(79,70,229,0.75)] hover:brightness-110',
  secondary:
    'border border-ink/[0.12] bg-white text-ink hover:border-ink/20 hover:bg-paper-soft shadow-sm',
  ghost: 'text-ink-700 hover:bg-ink/[0.05] hover:text-ink',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  dark: 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  'danger-ghost': 'text-rose-600 hover:bg-rose-50',
}

const sizes = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  className,
  children,
  loading = false,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  type = 'button',
  ...props
}) {
  const classes = cn(
    'inline-flex select-none items-center justify-center font-semibold transition duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  )
}
