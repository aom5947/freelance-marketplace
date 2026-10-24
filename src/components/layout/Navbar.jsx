import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from '@/components/common/Button'
import { UserMenu } from './UserMenu'
import { useAuth } from '@/contexts/AuthContext'
import { publicNav } from '@/constants'
import { cn } from '@/utils/cn'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const dashboardPath = user?.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard'

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || open
          ? 'border-b border-ink/[0.07] bg-paper/85 backdrop-blur-xl'
          : 'bg-transparent',
      )}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหลัก">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-[13px] font-semibold transition',
                    isActive
                      ? 'bg-ink/[0.05] text-ink'
                      : 'text-ink-500 hover:bg-ink/[0.04] hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button to={dashboardPath} variant="secondary" size="sm" className="hidden sm:inline-flex">
                แดชบอร์ด
              </Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-600 transition hover:text-ink sm:block"
              >
                เข้าสู่ระบบ
              </Link>
              <Button to="/register" variant="primary" size="sm" className="hidden sm:inline-flex">
                เริ่มใช้งานฟรี
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink lg:hidden"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-ink/[0.06] bg-paper lg:hidden"
          >
            <nav className="container-page flex flex-col gap-1 py-4" aria-label="เมนูมือถือ">
              {publicNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                      isActive ? 'bg-white text-ink shadow-sm' : 'text-ink-600 hover:bg-white/60',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {isAuthenticated ? (
                  <Button to={dashboardPath} variant="primary" size="md" className="col-span-2">
                    ไปที่แดชบอร์ด
                  </Button>
                ) : (
                  <>
                    <Button to="/login" variant="secondary" size="md">
                      เข้าสู่ระบบ
                    </Button>
                    <Button to="/register" variant="primary" size="md">
                      สมัครใช้งาน
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
