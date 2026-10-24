import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Briefcase, CheckCircle2, Flag, ShieldAlert, Users } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { adminService } from '@/services/api/adminService'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Avatar } from '@/components/common/Avatar'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { jobStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'

const sections = ['users', 'jobs', 'reports']

export default function AdminConsole() {
  const { section = 'users' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const tab = sections.includes(section) ? section : 'users'
  useDocumentTitle('Admin console')

  const { data, loading, error, refresh } = useAsync(() => adminService.getOverview(), [])
  const [busyId, setBusyId] = useState(null)

  if (!sections.includes(section)) {
    return <Navigate to="/admin/users" replace />
  }

  const users = data?.users || []
  const jobs = data?.jobs || []
  const reports = data?.reports || []

  const toggleUser = async (user) => {
    setBusyId(user.id)
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      await adminService.updateUserStatus(user.id, nextStatus)
      toast.success(
        nextStatus === 'active' ? 'คืนสถานะบัญชีแล้ว' : 'ระงับบัญชีแล้ว',
        'การเปลี่ยนแปลงมีผลเฉพาะ mock data',
      )
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  const resolveReport = async (report) => {
    setBusyId(report.id)
    try {
      await adminService.resolveReport(report.id, 'resolved')
      toast.success('ปิดรายงานแล้ว', 'สถานะถูกอัปเดตใน mock data')
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin demo"
        title="Admin console"
        description="หน้าจอตัวอย่างสำหรับจัดการผู้ใช้ ประกาศงาน และรายงานปัญหา — ไม่มี Backend สำหรับ Admin"
        actions={
          <Button to="/settings" variant="secondary" size="md">
            กลับไปตั้งค่า
          </Button>
        }
      />

      <InfoBanner tone="warning" className="mb-5" title="Demo only">
        Admin console นี้เป็นส่วนเสริมเพื่อสาธิต UI การจัดการ — การกระทำทั้งหมดเกิดกับ mock data
        ในเบราว์เซอร์ของคุณเท่านั้น และไม่มีระบบสิทธิ์ในระดับ production
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="ผู้ใช้ทั้งหมด" value={loading ? '—' : users.length} icon={Users} tone="brand" />
        <StatCard label="ประกาศงาน" value={loading ? '—' : jobs.length} icon={Briefcase} tone="blue" />
        <StatCard label="รายงานที่เปิดอยู่" value={loading ? '—' : reports.filter((r) => r.status !== 'resolved').length} icon={Flag} tone="amber" />
      </div>

      <Tabs
        value={tab}
        onChange={(next) => navigate(`/admin/${next}`)}
        className="my-5"
        items={[
          { value: 'users', label: 'ผู้ใช้', count: users.length },
          { value: 'jobs', label: 'ประกาศงาน', count: jobs.length },
          { value: 'reports', label: 'รายงานปัญหา', count: reports.length },
        ]}
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : tab === 'users' ? (
        users.length === 0 ? (
          <EmptyState icon={Users} title="ไม่พบผู้ใช้" />
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[2fr_1.2fr_0.8fr_0.9fr_1fr] gap-3 border-b border-ink/[0.06] bg-paper-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid">
              <span>ผู้ใช้</span>
              <span>บทบาท</span>
              <span>สถานะ</span>
              <span>เข้าร่วม</span>
              <span className="text-right">การจัดการ</span>
            </div>
            <ul className="divide-y divide-ink/[0.06]">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="grid gap-2 px-5 py-3.5 md:grid-cols-[2fr_1.2fr_0.8fr_0.9fr_1fr] md:items-center md:gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      name={user.name}
                      color={user.role === 'client' ? 'from-indigo-500 to-violet-500' : 'from-violet-500 to-indigo-600'}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-[10px] text-ink-400">{user.contact}</p>
                    </div>
                  </div>
                  <span className="text-[11px] capitalize text-ink-500">{user.role}</span>
                  <span>
                    <StatusBadge
                      label={
                        user.status === 'active' ? 'ใช้งาน' : user.status === 'pending' ? 'รอยืนยัน' : 'ระงับ'
                      }
                      tone={user.status === 'active' ? 'emerald' : user.status === 'pending' ? 'amber' : 'rose'}
                    />
                  </span>
                  <span className="text-[10.5px] text-ink-400">{formatDate(user.joined)}</span>
                  <div className="flex items-center gap-1.5 md:justify-end">
                    {user.role === 'client' ? (
                      <Button
                        variant={user.status === 'active' ? 'danger-ghost' : 'subtle'}
                        size="sm"
                        loading={busyId === user.id}
                        onClick={() => toggleUser(user)}
                      >
                        {user.status === 'active' ? 'ระงับ' : 'คืนสถานะ'}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-ink-400">—</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : tab === 'jobs' ? (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[2.2fr_1.1fr_0.8fr_1fr_0.9fr] gap-3 border-b border-ink/[0.06] bg-paper-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid">
            <span>ประกาศงาน</span>
            <span>สถานะ</span>
            <span>ข้อเสนอ</span>
            <span>งบประมาณ</span>
            <span className="text-right">ดู</span>
          </div>
          <ul className="divide-y divide-ink/[0.06]">
            {jobs.map((job) => {
              const status = jobStatus[job.status]
              return (
                <li
                  key={job.id}
                  className="grid gap-2 px-5 py-3.5 md:grid-cols-[2.2fr_1.1fr_0.8fr_1fr_0.9fr] md:items-center md:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-ink">{job.title}</p>
                    <p className="text-[10px] text-ink-400">{formatDate(job.createdAt)}</p>
                  </div>
                  <span>
                    <StatusBadge label={status?.label} tone={status?.tone} />
                  </span>
                  <span className="text-[11px] text-ink-500">{job.proposalsCount}</span>
                  <span className="text-[11px] font-semibold text-ink">
                    {formatCurrency(job.budgetMin, { compact: true })}–{formatCurrency(job.budgetMax, { compact: true })}
                  </span>
                  <div className="text-right">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-[11px] font-semibold text-brand-700 hover:underline"
                    >
                      เปิดประกาศ →
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <EmptyState icon={Flag} title="ไม่มีรายงานปัญหา" />
          ) : (
            reports.map((report) => (
              <article key={report.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <ShieldAlert className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-bold text-ink">{report.target}</p>
                    <StatusBadge
                      label={
                        report.status === 'open' ? 'เปิดอยู่' : report.status === 'reviewing' ? 'กำลังตรวจ' : 'ปิดแล้ว'
                      }
                      tone={report.status === 'open' ? 'rose' : report.status === 'reviewing' ? 'amber' : 'emerald'}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {report.reason} · โดย {report.reporter} · {formatDate(report.createdAt)}
                  </p>
                </div>
                {report.status !== 'resolved' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={CheckCircle2}
                    loading={busyId === report.id}
                    onClick={() => resolveReport(report)}
                  >
                    ปิดรายงาน
                  </Button>
                ) : (
                  <span className="text-[10.5px] font-semibold text-emerald-600">จัดการแล้ว</span>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </div>
  )
}
