import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function Logo({ className, dark = false, size = 'md' }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="Freelink — กลับหน้าแรก"
    >
      <span
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl bg-ink shadow-glow',
          size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        )}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="logo-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818CF8" />
              <stop offset="1" stopColor="#C4B5FD" />
            </linearGradient>
          </defs>
          <path d="M12 20 20 12" stroke="url(#logo-gradient)" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="10.5" cy="21.5" r="3.4" stroke="url(#logo-gradient)" strokeWidth="2.6" />
          <circle cx="21.5" cy="10.5" r="3.4" stroke="url(#logo-gradient)" strokeWidth="2.6" />
        </svg>
      </span>
      <span
        className={cn(
          'font-display text-[19px] font-extrabold tracking-[-0.04em]',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        Freelink<span className="text-brand-500">.</span>
      </span>
    </Link>
  )
}
