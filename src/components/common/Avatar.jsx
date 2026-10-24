import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-28 w-28 text-3xl',
}

export function Avatar({ name, src, color = 'from-indigo-500 to-violet-500', size = 'md', className, ring = false }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white',
        color,
        sizes[size],
        ring && 'ring-4 ring-white shadow-soft',
        className,
      )}
      aria-label={name}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  )
}
