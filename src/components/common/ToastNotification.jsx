import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/utils/cn'

const variants = {
  success: { icon: CheckCircle2, ring: 'text-emerald-600 bg-emerald-50', bar: 'bg-emerald-500' },
  error: { icon: XCircle, ring: 'text-rose-600 bg-rose-50', bar: 'bg-rose-500' },
  warning: { icon: AlertTriangle, ring: 'text-amber-600 bg-amber-50', bar: 'bg-amber-500' },
  info: { icon: Info, ring: 'text-brand-600 bg-brand-50', bar: 'bg-brand-500' },
}

export function ToastViewport() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[110] flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-[380px]"
      role="region"
      aria-label="การแจ้งเตือน"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const config = variants[toast.variant] || variants.info
          const Icon = config.icon
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-ink/[0.07] bg-white p-3.5 shadow-lift"
            >
              <div className="flex items-start gap-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', config.ring)}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-semibold text-ink">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-md p-1 text-ink-400 transition hover:bg-ink/5 hover:text-ink"
                  aria-label="ปิดการแจ้งเตือน"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className={cn('absolute inset-x-0 bottom-0 h-0.5 opacity-60', config.bar)} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
