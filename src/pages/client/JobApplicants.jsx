import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowUpDown, GitCompareArrows, Users, UserCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobService } from '@/services/api/jobService'
import { proposalService } from '@/services/api/proposalService'
import { projectService } from '@/services/api/projectService'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/common/Tabs'
import { ProposalCard } from '@/components/proposals/ProposalCard'
import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/FormField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { JobListSkeleton, Skeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency } from '@/utils/format'

export default function JobApplicants() {
  const { jobId } = useParams()
  const { profileId } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const jobQuery = useAsync(() => jobService.getJob(jobId), [jobId])
  useDocumentTitle(jobQuery.data ? `ผู้สมัคร — ${jobQuery.data.title}` : 'ผู้สมัคร')

  const proposalQuery = useAsync(() => proposalService.listByJob(jobId), [jobId])
  const projectQuery = useAsync(
    () => projectService.listProjects({ role: 'client', profileId }),
    [profileId],
  )

  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('recent')
  const [confirm, setConfirm] = useState(null)
  const [hiring, setHiring] = useState(false)
  const [shortlistingId, setShortlistingId] = useState(null)

  const job = jobQuery.data
  const proposals = proposalQuery.data || []
  const project = (projectQuery.data || []).find((item) => item.jobId === jobId)

  const counts = useMemo(
    () => ({
      all: proposals.length,
      pending: proposals.filter((proposal) => proposal.status === 'pending').length,
      shortlisted: proposals.filter((proposal) => proposal.status === 'shortlisted').length,
      hired: proposals.filter((proposal) => proposal.status === 'hired').length,
      rejected: proposals.filter((proposal) => proposal.status === 'rejected').length,
    }),
    [proposals],
  )

  const sorted = useMemo(() => {
    const list = proposals.filter((proposal) => tab === 'all' || proposal.status === tab)
    return [...list].sort((a, b) => {
      if (sort === 'bid_asc') return a.bidAmount - b.bidAmount
      if (sort === 'bid_desc') return b.bidAmount - a.bidAmount
      if (sort === 'rating') return (b.freelancer?.rating || 0) - (a.freelancer?.rating || 0)
      if (sort === 'fastest') return a.deliveryDays - b.deliveryDays
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [proposals, tab, sort])

  const shortlist = async (proposal) => {
    setShortlistingId(proposal.id)
    try {
      await proposalService.updateStatus(proposal.id, 'shortlisted')
      toast.success('คัดเลือกข้อเสนอแล้ว', `${proposal.freelancer?.name} — สถานะถูกอัปเดตใน mock data`)
      await proposalQuery.refresh()
    } catch (error) {
      toast.error('อัปเดตไม่สำเร็จ', error.message)
    } finally {
      setShortlistingId(null)
    }
  }

  const hire = async () => {
    if (!confirm) return
    setHiring(true)
    try {
      const result = await proposalService.hire(confirm.id)
      toast.success(
        'จ้างฟรีแลนซ์แล้ว',
        'สร้างโครงการในสถานะ “ยังไม่ฝากเงิน escrow” — การชำระเงินจริงต้องรอ Smart Contract',
      )
      setConfirm(null)
      navigate(`/client/projects/${result.project.id}`)
    } catch (error) {
      toast.error('จ้างงานไม่สำเร็จ', error.message)
    } finally {
      setHiring(false)
    }
  }

  if (jobQuery.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <JobListSkeleton count={2} />
      </div>
    )
  }

  if (jobQuery.error || !job) {
    return <ErrorState error={jobQuery.error} onRetry={jobQuery.refresh} />
  }

  if (job.clientId !== profileId) {
    return (
      <EmptyState
        title="คุณไม่มีสิทธิ์ดูผู้สมัครของประกาศนี้"
        description="ประกาศงานนี้เป็นของบัญชีลูกค้าอื่น — กลับไปที่ประกาศงานของคุณ"
        action={
          <Button to="/client/jobs" variant="primary">
            กลับไปประกาศงานของฉัน
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Applicants"
        title="ผู้สมัครและข้อเสนอ"
        description={job.title}
        backTo="/client/jobs"
        backLabel="กลับไปประกาศงาน"
        actions={
          <>
            <Button to={`/jobs/${job.id}`} variant="secondary" size="md">
              ดูประกาศงาน
            </Button>
            <Button to={`/client/jobs/${job.id}/compare`} variant="brand" size="md" icon={GitCompareArrows}>
              เปรียบเทียบข้อเสนอ
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-xl border border-ink/[0.07] bg-white px-4 py-3 text-[11.5px] text-ink-500">
        <StatusBadge
          label={job.status === 'open' ? 'เปิดรับข้อเสนอ' : 'ปิดรับข้อเสนอ'}
          tone={job.status === 'open' ? 'emerald' : 'slate'}
          pulse={job.status === 'open'}
        />
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {proposals.length} ข้อเสนอ
        </span>
        <span className="text-ink-300">•</span>
        <span>
          งบประมาณ {formatCurrency(job.budgetMin, { compact: true })}–{formatCurrency(job.budgetMax, { compact: true })}
        </span>
        <span className="text-ink-300">•</span>
        <span>ระยะเวลา {job.duration}</span>
        {project && (
          <>
            <span className="text-ink-300">•</span>
            <Link to={`/client/projects/${project.id}`} className="font-semibold text-brand-700 hover:underline">
              โครงการที่สร้างแล้ว →
            </Link>
          </>
        )}
      </div>

      <InfoBanner tone="info" className="mb-5" title="การจ้างงานในโหมดจำลอง">
        เมื่อจ้าง ระบบจะสร้างโครงการและตั้งสถานะ escrow เป็น “ยังไม่ฝากเงิน”
        — เงินจะไม่ถูกโอนจริง การฝากเงินจริงอยู่ในหน้าจอ Escrow และต้องเชื่อมต่อ Smart Contract ก่อน
      </InfoBanner>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'ทั้งหมด', count: counts.all },
            { value: 'pending', label: 'รอพิจารณา', count: counts.pending },
            { value: 'shortlisted', label: 'คัดเลือก', count: counts.shortlisted },
            { value: 'hired', label: 'จ้างแล้ว', count: counts.hired },
            { value: 'rejected', label: 'ไม่ผ่าน', count: counts.rejected },
          ]}
        />
        <div className="w-full sm:w-56">
          <Select
            aria-label="เรียงข้อเสนอ"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">ล่าสุด</option>
            <option value="bid_asc">ราคาต่ำสุด</option>
            <option value="bid_desc">ราคาสูงสุด</option>
            <option value="rating">คะแนนสูงสุด</option>
            <option value="fastest">ส่งเร็วที่สุด</option>
          </Select>
        </div>
      </div>

      {proposalQuery.loading ? (
        <JobListSkeleton count={3} />
      ) : proposalQuery.error ? (
        <ErrorState error={proposalQuery.error} onRetry={proposalQuery.refresh} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title={tab === 'all' ? 'ยังไม่มีผู้สมัคร' : 'ไม่มีข้อเสนอในสถานะนี้'}
          description={
            tab === 'all'
              ? 'แชร์ประกาศงานหรือปรับรายละเอียดให้ชัดเจนขึ้นเพื่อดึงดูดฟรีแลนซ์ที่เหมาะกับงาน'
              : 'ลองเปลี่ยนแท็บหรือกลับไปดูข้อเสนอทั้งหมด'
          }
          action={
            tab !== 'all' ? (
              <Button variant="secondary" onClick={() => setTab('all')}>
                ดูข้อเสนอทั้งหมด
              </Button>
            ) : (
              <Button to={`/jobs/${job.id}`} variant="secondary">
                ดูประกาศงาน
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((proposal) => {
            const canHire = ['pending', 'shortlisted'].includes(proposal.status) && !project
            return (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                actions={
                  <>
                    <Button to={`/freelancers/${proposal.freelancerId}`} variant="secondary" size="sm">
                      ดูโปรไฟล์
                    </Button>
                    {proposal.status === 'pending' && (
                      <Button
                        variant="subtle"
                        size="sm"
                        loading={shortlistingId === proposal.id}
                        onClick={() => shortlist(proposal)}
                      >
                        คัดเลือก
                      </Button>
                    )}
                    {canHire && (
                      <Button
                        variant="brand"
                        size="sm"
                        icon={UserCheck}
                        onClick={() => setConfirm(proposal)}
                      >
                        จ้างงาน
                      </Button>
                    )}
                    {proposal.status === 'hired' && project && (
                      <Button to={`/client/projects/${project.id}`} variant="brand" size="sm">
                        ไปที่โครงการ
                      </Button>
                    )}
                  </>
                }
              />
            )
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2">
        <ArrowUpDown className="h-3.5 w-3.5 text-ink-400" />
        <p className="text-[11px] text-ink-400">
          ข้อมูลผู้สมัคร ข้อเสนอ และการจ้างทั้งหมดเป็นข้อมูลจำลอง
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={hire}
        loading={hiring}
        title="ยืนยันการจ้างฟรีแลนซ์?"
        description={
          confirm
            ? `จ้าง ${confirm.freelancer?.name} ในราคา ${formatCurrency(confirm.bidAmount)} ระยะเวลา ${confirm.deliveryDays} วัน — ระบบจะสร้างโครงการและปิดรับข้อเสนออื่นใน mock data`
            : ''
        }
        confirmLabel="ยืนยันการจ้าง"
        tone="brand"
      />
    </div>
  )
}
