import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

function getPages(page, pageCount) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1)
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const sorted = [...pages].filter((item) => item >= 1 && item <= pageCount).sort((a, b) => a - b)
  const withGaps = []
  sorted.forEach((item, index) => {
    if (index > 0 && item - sorted[index - 1] > 1) withGaps.push('…')
    withGaps.push(item)
  })
  return withGaps
}

export function Pagination({ page = 1, pageCount = 1, onChange, className }) {
  if (pageCount <= 1) return null
  const pages = getPages(page, pageCount)

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="การแบ่งหน้า">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((item, index) =>
        item === '…' ? (
          <span key={`gap-${index}`} className="px-1.5 text-sm text-ink-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold transition',
              item === page
                ? 'border-ink bg-ink text-white'
                : 'border-ink/10 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"
        aria-label="หน้าถัดไป"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
