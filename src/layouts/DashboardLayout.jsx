import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Logo } from '@/components/layout/Logo'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { UserMenu } from '@/components/layout/UserMenu'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { PageTransition } from '@/components/layout/PageTransition'
import { useAuth } from '@/contexts/AuthContext'
import { clientNav, freelancerNav, sharedNav } from '@/constants'

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { role } = useAuth()
  const location = useLocation()

  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const nav = [...(role === 'client' ? clientNav : freelancerNav), ...sharedNav]
  const active = nav.find((item) => item.to !== '/admin' && location.pathname.startsWith(item.to))
  const title =
    location.pathname.includes('/jobs/new')
      ? 'สร้างประกาศงาน'
      : location.pathname.includes('/edit')
        ? 'แก้ไขประกาศงาน'
        : active?.label || 'Workspace'

  return (
    <div className="min-h-screen bg-paper">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        ข้ามไปยังเนื้อหา
      </a>

      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>
      <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-ink/[0.07] bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink lg:hidden"
                aria-label="เปิดเมนู"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
              <div className="lg:hidden">
                <Logo size="sm" />
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Freelink workspace
                </p>
                <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={role === 'freelancer' ? '/freelancer/jobs' : '/client/jobs'}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink-500 transition hover:border-brand-300 hover:text-brand-700 sm:flex"
                aria-label="ค้นหางาน"
              >
                <Search className="h-4 w-4" />
              </Link>
              <NotificationBell />
              <div className="hidden sm:block">
                <WalletConnectButton size="sm" />
              </div>
              <UserMenu compact />
            </div>
          </div>
        </header>

        <main id="dashboard-content" className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="mx-auto w-full max-w-[1160px]">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
