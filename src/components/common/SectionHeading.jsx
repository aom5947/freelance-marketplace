import { cn } from '@/utils/cn'

export function SectionHeading({ eyebrow, title, description, align = 'left', className, dark = false }) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && (
        <p className={cn('eyebrow mb-3', dark && 'text-brand-300')}>{eyebrow}</p>
      )}
      <h2
        className={cn(
          'text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl',
          dark && 'text-white',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-[15px] leading-relaxed text-ink-500',
            dark && 'text-white/60',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
