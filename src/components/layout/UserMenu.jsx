import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/common/Avatar'
import { cn } from '@/utils/cn'

export function UserMenu({ compact = false, dark = false }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!user) return null

  const dashboardPath = user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard'
  const profilePath = user.role === 'client' ? '/client/profile' : '/freelancer/profile'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex items-center gap-2 rounded-full border p-1 pr-2 transition',
          dark
            ? 'border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]'
            : 'border-ink/10 bg-white text-ink hover:border-brand-300',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="เมนูบัญชี"
      >
        <Avatar name={user.name} color={user.avatarColor} size="xs" />
        {!compact && (
          <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:block">
            {user.name}
          </span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-ink/[0.08] bg-white shadow-lift"
        >
          <div className="border-b border-ink/[0.06] px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-ink-500">{user.email}</p>
            <span className="mt-1.5 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              {user.role === 'client' ? 'Client' : 'Freelancer'} · Demo
            </span>
          </div>
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-600 transition hover:bg-paper"
            role="menuitem"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> แดชบอร์ด
          </Link>
          <Link
            to={profilePath}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-600 transition hover:bg-paper"
            role="menuitem"
          >
            <UserRound className="h-3.5 w-3.5" /> โปรไฟล์ของฉัน
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-600 transition hover:bg-paper"
            role="menuitem"
          >
            <Settings className="h-3.5 w-3.5" /> ตั้งค่า
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false)
              await signOut()
              navigate('/')
            }}
            className="flex w-full items-center gap-2 border-t border-ink/[0.06] px-4 py-2.5 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
            role="menuitem"
          >
            <LogOut className="h-3.5 w-3.5" /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  )
}
