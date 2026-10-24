import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/utils/cn'

const tones = {
  info: { wrapper: 'border-brand-100 bg-brand-50/60', icon: 'text-brand-600', Icon: Info },
  warning: { wrapper: 'border-amber-200 bg-amber-50/70', icon: 'text-amber-600', Icon: AlertTriangle },
  danger: { wrapper: 'border-rose-200 bg-rose-50/70', icon: 'text-rose-600', Icon: ShieldAlert },
}

export function InfoBanner({ tone = 'info', title, children, className, icon: CustomIcon }) {
  const config = tones[tone] || tones.info
  const Icon = CustomIcon || config.Icon
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3.5', config.wrapper, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.icon)} aria-hidden="true" />
      <div className="text-[13px] leading-relaxed text-ink-600">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
    </div>
  )
}
