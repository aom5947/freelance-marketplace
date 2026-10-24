import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Eye,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobService } from '@/services/api/jobService'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { jobStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'

export default function ManageJobs() {
  useDocumentTitle('จัดการประกาศงาน')
  const { profileId } = useAuth()
  const toast = useToast()
  const { data, loading, error, refresh } = useAsync(
    () => jobService.listClientJobs(profileId),
    [profileId],
  )
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const jobs = data || []

  const counts = useMemo(
    () => ({
      all: jobs.length,
      open: jobs.filter((job) => job.status === 'open').length,
      in_progress: jobs.filter((job) => job.status === 'in_progress').length,
      draft: jobs.filter((job) => job.status === 'draft').length,
      closed: jobs.filter((job) => job.status === 'closed').length,
    }),
    [jobs],
  )

  const filtered = jobs.filter((job) => {
    if (tab !== 'all' && job.status !== tab) return false
    if (query.trim() && !job.title.toLowerCase().includes(query.trim().toLowerCase())) return false
    return true
  })

  const handleConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.action === 'close') {
        await jobService.updateJob(confirm.job.id, { status: 'closed' })
        toast.success('ปิดรับข้อเสนอแล้ว', confirm.job.title)
      } else {
        await jobService.deleteJob(confirm.job.id)
        toast.success('ลบประกาศงานแล้ว', 'การลบนี้เกิดขึ้นกับข้อมูลจำลองในเครื่อง')
      }
      setConfirm(null)
      await refresh()
    } catch (err) {
      toast.error('ทำรายการไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Manage jobs"
        title="ประกาศงานของฉัน"
        description="แก้ไขประกาศ ดูผู้สมัคร เปรียบเทียบข้อเสนอ และปิดรับเมื่อได้คนที่ใช่"
        actions={
          <Button to="/client/jobs/new" variant="brand" size="md" icon={PlusCircle}>
            สร้างประกาศงาน
          </Button>
        }
      />

      <InfoBanner tone="warning" className="mb-5" title="Mock workflow">
        การแก้ไข ลบ และปิดรับจะอัปเดตข้อมูลจำลองในเบราว์เซอร์ของคุณทันที
        — รีเซ็ตได้ที่หน้าตั้งค่า
      </InfoBanner>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'ทั้งหมด', count: counts.all },
            { value: 'open', label: 'เปิดรับ', count: counts.open },
            { value: 'in_progress', label: 'กำลังทำ', count: counts.in_progress },
            { value: 'draft', label: 'ฉบับร่าง', count: counts.draft },
            { value: 'closed', label: 'ปิดรับ', count: counts.closed },
          ]}
        />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อประกาศ…"
            className="h-9 w-full rounded-lg border border-ink/10 bg-white pl-9 pr-3 text-xs text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            aria-label="ค้นหาประกาศงาน"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={query ? 'ไม่พบประกาศที่ตรงกับคำค้น' : 'ยังไม่มีประกาศงานในหมวดนี้'}
          description={
            query
              ? 'ลองค้นหาด้วยคำอื่น หรือเปลี่ยนหมวดที่กำลังดูอยู่'
              : 'สร้างประกาศแรกของคุณเพื่อเริ่มรับข้อเสนอจากฟรีแลนซ์'
          }
          action={
            <Button to="/client/jobs/new" variant="brand" size="sm" icon={PlusCircle}>
              สร้างประกาศงาน
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[2.4fr_1fr_0.7fr_0.9fr_1.7fr] gap-4 border-b border-ink/[0.06] bg-paper-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid">
            <span>ประกาศงาน</span>
            <span>สถานะ</span>
            <span>ข้อเสนอ</span>
            <span>งบประมาณ</span>
            <span className="text-right">การจัดการ</span>
          </div>

          <ul className="divide-y divide-ink/[0.06]">
            {filtered.map((job) => {
              const status = jobStatus[job.status]
              return (
                <li
                  key={job.id}
                  className="grid gap-3 px-5 py-4 transition hover:bg-paper-soft/50 md:grid-cols-[2.4fr_1fr_0.7fr_0.9fr_1.7fr] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="line-clamp-1 text-[13px] font-semibold text-ink transition hover:text-brand-700"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-1 text-[10.5px] text-ink-400">
                      สร้างเมื่อ {formatDate(job.createdAt)} · กำหนดส่ง {formatDate(job.deadline)}
                    </p>
                  </div>
                  <div>
                    <StatusBadge label={status?.label} tone={status?.tone} pulse={job.status === 'open'} />
                  </div>
                  <div className="text-[11.5px] text-ink-600">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {job.proposalsCount}
                    </span>
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink">
                    {formatCurrency(job.budgetMin, { compact: true })}–{formatCurrency(job.budgetMax, { compact: true })}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                    {job.status === 'open' && (
                      <>
                        <Button
                          to={`/client/jobs/${job.id}/applicants`}
                          variant="subtle"
                          size="sm"
                          icon={Users}
                        >
                          ผู้สมัคร
                        </Button>
                        <Button
                          to={`/client/jobs/${job.id}/compare`}
                          variant="ghost"
                          size="sm"
                        >
                          เปรียบเทียบ
                        </Button>
                      </>
                    )}
                    <Link
                      to={`/client/jobs/${job.id}/edit`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                      aria-label={`แก้ไข ${job.title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                      aria-label={`ดูประกาศ ${job.title}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    {job.status !== 'closed' && job.status !== 'draft' && (
                      <button
                        type="button"
                        onClick={() => setConfirm({ action: 'close', job })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-amber-50 hover:text-amber-600"
                        aria-label={`ปิดรับ ${job.title}`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirm({ action: 'delete', job })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`ลบ ${job.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={busy}
        title={confirm?.action === 'close' ? 'ปิดรับข้อเสนอ?' : 'ลบประกาศงาน?'}
        description={
          confirm?.action === 'close'
            ? `ประกาศ “${confirm?.job.title}” จะไม่รับข้อเสนอใหม่ แต่ผู้สมัครเดิมยังดูได้`
            : `ประกาศ “${confirm?.job.title}” และข้อเสนอที่เกี่ยวข้องจะถูกลบจากข้อมูลจำลอง — ไม่สามารถย้อนกลับได้`
        }
        confirmLabel={confirm?.action === 'close' ? 'ปิดรับข้อเสนอ' : 'ลบประกาศ'}
        tone={confirm?.action === 'close' ? 'secondary' : 'danger'}
      />
    </div>
  )
}
