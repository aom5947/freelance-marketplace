import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/utils/cn'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backTo,
  backLabel = 'ย้อนกลับ',
  className,
  children,
}) {
  return (
    <div className={cn('mb-7', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-[34px]">{title}</h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-ink-500 sm:text-[15px]">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
