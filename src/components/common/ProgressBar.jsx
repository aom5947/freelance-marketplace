import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export function ProgressBar({ value = 0, tone = 'brand', showLabel = false, className }) {
  const tones = {
    brand: 'bg-brand-gradient',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }
  const safe = Math.max(0, Math.min(100, Number(value)))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium">
          <span className="text-ink-500">ความคืบหน้า</span>
          <span className="font-semibold text-ink">{safe}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={cn('h-full rounded-full', tones[tone] || tones.brand)}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
