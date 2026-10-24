import { Link, NavLink } from 'react-router-dom'
import { ShieldCheck, X } from 'lucide-react'
import { Logo } from './Logo'
import { Avatar } from '@/components/common/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { adminNav, clientNav, freelancerNav, sharedNav } from '@/constants'
import { cn } from '@/utils/cn'

function NavItem({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition',
          isActive
            ? 'bg-white/[0.09] text-white'
            : 'text-white/55 hover:bg-white/[0.05] hover:text-white/90',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
          )}
          <Icon
            className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-300' : 'text-white/40 group-hover:text-white/70')}
            aria-hidden="true"
          />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ onNavigate, onClose, mobile = false, className }) {
  const { user, role } = useAuth()
  const primaryNav = role === 'client' ? clientNav : freelancerNav

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-ink text-white',
        mobile ? 'w-full' : 'w-[264px]',
        className,
      )}
      aria-label="เมนูแดชบอร์ด"
    >
      <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
        <Logo dark size="sm" />
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="ปิดเมนู"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
          <Avatar name={user?.name || 'User'} color={user?.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{user?.displayName || user?.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              {role === 'client' ? 'Client workspace' : 'Freelancer workspace'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin" aria-label="เมนูหลัก">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
          {role === 'client' ? 'การจ้างงาน' : 'งานของฉัน'}
        </p>
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>

        <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
          บัญชี & เครื่องมือ
        </p>
        <div className="space-y-0.5">
          {sharedNav.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>

        <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
          Demo admin
        </p>
        <div className="space-y-0.5">
          {adminNav.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <Link
          to="/wallet"
          onClick={onNavigate}
          className="group block overflow-hidden rounded-xl border border-brand-400/20 bg-gradient-to-br from-brand-600/25 to-violet-600/10 p-3.5 transition hover:border-brand-400/40"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Escrow protection
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
            เงินถูกเก็บในสัญญาและปล่อยเมื่อตรวจรับงาน
          </p>
          <span className="mt-2 inline-flex text-[10px] font-semibold text-white/70 transition group-hover:text-white">
            ดูสถานะกระเป๋าเงิน →
          </span>
        </Link>
      </div>
    </aside>
  )
}
