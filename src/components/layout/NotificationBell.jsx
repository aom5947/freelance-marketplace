import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService } from '@/services/api/notificationService'

export function NotificationBell() {
  const { role } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    if (!role) return undefined
    notificationService
      .list(role)
      .then((items) => {
        if (active) setUnread(items.filter((item) => !item.read).length)
      })
      .catch(() => {
        if (active) setUnread(0)
      })
    return () => {
      active = false
    }
  }, [role])

  return (
    <Link
      to="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink-500 transition hover:border-brand-300 hover:text-brand-700"
      aria-label={unread ? `การแจ้งเตือน ${unread} รายการที่ยังไม่อ่าน` : 'การแจ้งเตือน'}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
