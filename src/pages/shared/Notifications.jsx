import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  FileCheck2,
  FileText,
  MessageSquare,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notificationService } from '@/services/api/notificationService'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { timeAgo } from '@/utils/format'
import { cn } from '@/utils/cn'

const typeIcons = {
  proposal: FileText,
  submission: FileCheck2,
  message: MessageSquare,
  payment: Wallet,
  job: BriefcaseBusiness,
}

const typeTones = {
  proposal: 'bg-brand-50 text-brand-600',
  submission: 'bg-amber-50 text-amber-600',
  message: 'bg-blue-50 text-blue-600',
  payment: 'bg-emerald-50 text-emerald-600',
  job: 'bg-violet-50 text-violet-600',
}

export default function Notifications() {
  useDocumentTitle('การแจ้งเตือน')
  const { role } = useAuth()
  const { data, loading, error, setData, refresh } = useAsync(
    () => notificationService.list(role),
    [role],
  )
  const [tab, setTab] = useState('all')
  const [marking, setMarking] = useState(false)

  const items = data || []
  const unread = useMemo(() => items.filter((item) => !item.read).length, [items])
  const filtered = items.filter((item) => (tab === 'unread' ? !item.read : true))

  const markRead = async (notification) => {
    if (notification.read) return
    setData((current) =>
      (current || []).map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    )
    try {
      await notificationService.markRead(notification.id)
    } catch {
      // Keep the optimistic state; the next load will reconcile with the mock db.
    }
  }

  const markAll = async () => {
    setMarking(true)
    try {
      await notificationService.markAllRead(role)
      setData((current) => (current || []).map((item) => ({ ...item, read: true })))
    } finally {
      setMarking(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Notifications"
        title="การแจ้งเตือน"
        description="ข้อเสนอ งานส่งตรวจ ข้อความ และความเคลื่อนไหวด้านการชำระเงินของคุณ"
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={CheckCheck}
            onClick={markAll}
            loading={marking}
            disabled={unread === 0}
          >
            อ่านทั้งหมด
          </Button>
        }
      />

      <InfoBanner tone="warning" className="mb-5" title="ข้อมูลจำลอง">
        การแจ้งเตือนถูกสร้างจาก mock data — ยังไม่มีระบบ realtime หรือ push notification
      </InfoBanner>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'all', label: 'ทั้งหมด', count: items.length },
          { value: 'unread', label: 'ยังไม่อ่าน', count: unread },
        ]}
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tab === 'unread' ? 'อ่านครบทุกแล้ว' : 'ยังไม่มีการแจ้งเตือน'}
          description={
            tab === 'unread'
              ? 'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่านในขณะนี้'
              : 'เมื่อมีข้อเสนอใหม่ งานส่งตรวจ หรือข้อความ การแจ้งเตือนจะแสดงที่นี่'
          }
          action={
            tab === 'unread' ? (
              <Button variant="secondary" onClick={() => setTab('all')}>
                ดูทั้งหมด
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-ink/[0.06]">
            {filtered.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell
              const tone = typeTones[notification.type] || typeTones.proposal
              return (
                <li
                  key={notification.id}
                  className={cn(
                    'transition hover:bg-paper-soft/60',
                    !notification.read && 'bg-brand-50/30',
                  )}
                >
                  <Link
                    to={notification.link || '/notifications'}
                    onClick={() => markRead(notification)}
                    className="flex items-start gap-3.5 px-5 py-4"
                  >
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-ink">{notification.title}</p>
                        {!notification.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="ยังไม่อ่าน" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                        {notification.body}
                      </p>
                      <p className="mt-1.5 text-[10px] text-ink-400">{timeAgo(notification.createdAt)}</p>
                    </div>
                    <span className="mt-1 hidden text-[10px] font-semibold text-brand-700 sm:block">
                      เปิด →
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
