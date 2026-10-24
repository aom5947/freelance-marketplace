import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export function FaqAccordion({ items, className, defaultOpen }) {
  const [openId, setOpenId] = useState(defaultOpen ?? null)

  return (
    <div className={cn('divide-y divide-ink/[0.07] overflow-hidden rounded-2xl border border-ink/[0.07] bg-white', className)}>
      {items.map((item) => {
        const open = openId === item.id
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                aria-expanded={open}
                aria-controls={`faq-panel-${item.id}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper-soft"
              >
                <span className="text-[13.5px] font-semibold text-ink">{item.question}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300',
                    open && 'rotate-180 text-brand-600',
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id={`faq-panel-${item.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-[12.5px] leading-relaxed text-ink-500">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
