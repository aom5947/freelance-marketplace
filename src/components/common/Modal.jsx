import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  hideClose = false,
}) {
  const panelRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return undefined
    const previousActive = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 50)

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      previousActive?.focus?.()
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onClose?.()}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            className={cn(
              'relative z-10 w-full overflow-hidden rounded-t-3xl border border-white/50 bg-white shadow-2xl sm:rounded-3xl',
              sizes[size],
              className,
            )}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 border-b border-ink/[0.07] px-6 py-5">
                <div>
                  {title && (
                    <h2 id="modal-title" className="text-lg font-bold tracking-tight">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="-mr-1 rounded-full p-1.5 text-ink-500 transition hover:bg-ink/5 hover:text-ink"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-ink/[0.07] bg-paper-soft px-6 py-4 sm:flex-row sm:justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
