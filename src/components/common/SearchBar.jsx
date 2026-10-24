import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'ค้นหางาน ฟรีแลนซ์ หรือทักษะ…',
  className,
  size = 'md',
  label = 'ค้นหา',
}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(value)
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn('relative w-full', className)}>
      <label htmlFor="global-search" className="sr-only">
        {label}
      </label>
      <Search
        className={cn(
          'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400',
          size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
        )}
        aria-hidden="true"
      />
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-xl border border-ink/10 bg-white pl-11 pr-20 text-ink shadow-sm transition placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'h-14 text-[15px]' : 'h-11 text-sm',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange?.('')}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink/5 hover:text-ink"
          aria-label="ล้างคำค้นหา"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-ink/10 bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
          Enter
        </kbd>
      )}
    </form>
  )
}
