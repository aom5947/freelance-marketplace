import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export function Tabs({ items, value, onChange, variant = 'underline', className, size = 'md' }) {
  const layoutId = useId()

  return (
    <div
      role="tablist"
      aria-label="ตัวเลือกมุมมอง"
      className={cn(
        'flex gap-1 overflow-x-auto no-scrollbar',
        variant === 'pill' && 'w-fit rounded-xl border border-ink/[0.07] bg-white p-1 shadow-sm',
        variant === 'underline' && 'border-b border-ink/[0.08]',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'relative shrink-0 whitespace-nowrap font-semibold transition',
              size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-[13px]',
              variant === 'pill' && 'rounded-lg',
              variant === 'underline' && '-mb-px border-b-2 border-transparent',
              active
                ? variant === 'pill'
                  ? 'text-ink'
                  : 'border-ink text-ink'
                : 'text-ink-500 hover:text-ink',
            )}
          >
            {variant === 'pill' && active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-paper shadow-sm ring-1 ring-ink/[0.04]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]',
                    active ? 'bg-brand-50 text-brand-700' : 'bg-ink/5 text-ink-500',
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
