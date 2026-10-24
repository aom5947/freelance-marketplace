import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, GitCompareArrows, Star, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobService } from '@/services/api/jobService'
import { proposalService } from '@/services/api/proposalService'
import { projectService } from '@/services/api/projectService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Avatar } from '@/components/common/Avatar'
import { RatingStars } from '@/components/common/RatingStars'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { proposalStatus } from '@/constants'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function CompareProposals() {
  const { jobId } = useParams()
  const { profileId } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const jobQuery = useAsync(() => jobService.getJob(jobId), [jobId])
  const proposalQuery = useAsync(() => proposalService.listByJob(jobId), [jobId])
  const projectQuery = useAsync(
    () => projectService.listProjects({ role: 'client', profileId }),
    [profileId],
  )
  useDocumentTitle(jobQuery.data ? `เปรียบเทียบข้อเสนอ — ${jobQuery.data.title}` : 'เปรียบเทียบข้อเสนอ')

  const [selected, setSelected] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [hiring, setHiring] = useState(false)

  const job = jobQuery.data
  const project = (projectQuery.data || []).find((item) => item.jobId === jobId)

  const candidates = useMemo(
    () => (proposalQuery.data || []).filter((proposal) => !['rejected', 'withdrawn'].includes(proposal.status)),
    [proposalQuery.data],
  )

  useEffect(() => {
    if (candidates.length === 0) return
    setSelected((current) => {
      if (current.length > 0) return current.filter((id) => candidates.some((item) => item.id === id))
      return [...candidates]
        .sort((a, b) => a.bidAmount - b.bidAmount)
        .slice(0, 3)
        .map((proposal) => proposal.id)
    })
  }, [candidates])

  const chosen = selected
    .map((id) => candidates.find((proposal) => proposal.id === id))
    .filter(Boolean)

  const best = useMemo(() => {
    if (chosen.length === 0) return {}
    const bid = Math.min(...chosen.map((item) => item.bidAmount))
    const delivery = Math.min(...chosen.map((item) => item.deliveryDays))
    const rating = Math.max(...chosen.map((item) => item.freelancer?.rating || 0))
    const completed = Math.max(...chosen.map((item) => item.freelancer?.completedJobs || 0))
    const skillMatch = Math.max(...chosen.map((item) => skillScore(item, job).count))
    return { bid, delivery, rating, completed, skillMatch }
  }, [chosen, job])

  const toggle = (id) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 4) {
        toast.warning('เลือกได้สูงสุด 4 คน', 'เอารายชื่อออกก่อนเพื่อเพิ่มคนใหม่')
        return current
      }
      return [...current, id]
    })
  }

  const hire = async () => {
    if (!confirm) return
    setHiring(true)
    try {
      const result = await proposalService.hire(confirm.id)
      toast.success('จ้างฟรีแลนซ์แล้ว', 'โครงการถูกสร้างด้วยสถานะ escrow ยังไม่ฝากเงิน (ข้อมูลจำลอง)')
      setConfirm(null)
      navigate(`/client/projects/${result.project.id}`)
    } catch (error) {
      toast.error('จ้างงานไม่สำเร็จ', error.message)
    } finally {
      setHiring(false)
    }
  }

  if (jobQuery.loading || proposalQuery.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (jobQuery.error || !job) return <ErrorState error={jobQuery.error} onRetry={jobQuery.refresh} />

  if (job.clientId !== profileId) {
    return (
      <EmptyState
        title="คุณไม่มีสิทธิ์เปรียบเทียบข้อเสนอของประกาศนี้"
        description="ประกาศงานนี้เป็นของบัญชีลูกค้าอื่น"
        action={
          <Button to="/client/jobs" variant="primary">
            กลับไปประกาศงานของฉัน
          </Button>
        }
      />
    )
  }

  if (proposalQuery.error) {
    return <ErrorState error={proposalQuery.error} onRetry={proposalQuery.refresh} />
  }

  if (candidates.length === 0) {
    return (
      <div>
        <PageHeader
          title="เปรียบเทียบข้อเสนอ"
          description={job.title}
          backTo={`/client/jobs/${job.id}/applicants`}
          backLabel="กลับไปผู้สมัคร"
        />
        <EmptyState
          icon={GitCompareArrows}
          title="ยังไม่มีข้อเสนอให้เปรียบเทียบ"
          description="เมื่อมีฟรีแลนซ์ส่งข้อเสนอ คุณจะเปรียบเทียบราคา ระยะเวลา และผลงานได้ในหน้านี้"
          action={
            <Button to={`/jobs/${job.id}`} variant="secondary">
              ดูประกาศงาน
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Compare proposals"
        title="เปรียบเทียบข้อเสนอ"
        description={`${job.title} — เลือกได้สูงสุด 4 คนเพื่อเทียบเคียงข้อมูลสำคัญ`}
        backTo={`/client/jobs/${job.id}/applicants`}
        backLabel="กลับไปผู้สมัคร"
      />

      <InfoBanner tone="info" className="mb-5" title="วิธีอ่านตาราง">
        ไฮไลต์สีเขียวคือค่าที่ดีที่สุดในกลุ่มที่เลือก — ไม่ได้หมายความว่าเหมาะที่สุดเสมอ
        ควรดูขอบเขตงานและตัวอย่างผลงานประกอบด้วย
      </InfoBanner>

      <div className="mb-4 card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          เลือกผู้สมัคร ({selected.length}/4)
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {candidates.map((proposal) => {
            const active = selected.includes(proposal.id)
            return (
              <button
                key={proposal.id}
                type="button"
                onClick={() => toggle(proposal.id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[11.5px] font-semibold transition',
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink/10 bg-white text-ink-600 hover:border-brand-300',
                )}
              >
                <Avatar
                  name={proposal.freelancer?.name || 'F'}
                  color={proposal.freelancer?.avatarColor}
                  size="xs"
                />
                {proposal.freelancer?.name}
                {active ? <Check className="h-3 w-3" /> : <span className="text-ink-300">+</span>}
              </button>
            )
          })}
        </div>
      </div>

      {chosen.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="เลือกอย่างน้อย 1 คนเพื่อดูตาราง"
          description="กดชื่อผู้สมัครด้านบนเพื่อเพิ่มเข้าเปรียบเทียบ"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink/[0.07] bg-paper-soft">
                  <th className="sticky left-0 z-10 bg-paper-soft px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    เกณฑ์เปรียบเทียบ
                  </th>
                  {chosen.map((proposal) => {
                    const status = proposalStatus[proposal.status]
                    return (
                      <th key={proposal.id} className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={proposal.freelancer?.name || 'F'}
                            color={proposal.freelancer?.avatarColor}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-bold text-ink">
                              {proposal.freelancer?.name}
                            </p>
                            <p className="truncate text-[10px] font-normal text-ink-400">
                              {proposal.freelancer?.title}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <StatusBadge label={status?.label} tone={status?.tone} />
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="text-[12px]">
                <Row label="ราคาเสนอ">
                  {chosen.map((proposal) => (
                    <Cell key={proposal.id} highlight={proposal.bidAmount === best.bid}>
                      <span className="text-[13px] font-bold text-ink">{formatCurrency(proposal.bidAmount)}</span>
                      {proposal.bidAmount === best.bid && <Trophy className="h-3 w-3 text-emerald-600" />}
                    </Cell>
                  ))}
                </Row>
                <Row label="ระยะเวลาส่งงาน">
                  {chosen.map((proposal) => (
                    <Cell key={proposal.id} highlight={proposal.deliveryDays === best.delivery}>
                      <span className="font-semibold text-ink">{proposal.deliveryDays} วัน</span>
                      {proposal.deliveryDays === best.delivery && <Trophy className="h-3 w-3 text-emerald-600" />}
                    </Cell>
                  ))}
                </Row>
                <Row label="คะแนนรีวิว">
                  {chosen.map((proposal) => (
                    <Cell key={proposal.id} highlight={proposal.freelancer?.rating === best.rating}>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-ink">{proposal.freelancer?.rating}</span>
                        <span className="text-ink-400">({proposal.freelancer?.reviewsCount})</span>
                      </span>
                    </Cell>
                  ))}
                </Row>
                <Row label="งานที่สำเร็จ">
                  {chosen.map((proposal) => (
                    <Cell key={proposal.id} highlight={proposal.freelancer?.completedJobs === best.completed}>
                      <span className="font-semibold text-ink">{proposal.freelancer?.completedJobs} งาน</span>
                    </Cell>
                  ))}
                </Row>
                <Row label="ทักษะที่ตรงกับงาน">
                  {chosen.map((proposal) => {
                    const score = skillScore(proposal, job)
                    return (
                      <Cell key={proposal.id} highlight={score.count === best.skillMatch}>
                        <span className="font-semibold text-ink">
                          {score.count}/{score.total}
                        </span>
                        <span className="text-ink-400"> ทักษะ</span>
                      </Cell>
                    )
                  })}
                </Row>
                <Row label="ข้อความแนะนำตัว">
                  {chosen.map((proposal) => (
                    <Cell key={proposal.id}>
                      <p className="line-clamp-4 text-[11px] leading-relaxed text-ink-500">
                        {proposal.coverLetter}
                      </p>
                    </Cell>
                  ))}
                </Row>
                <Row label="การจัดการ" last>
                  {chosen.map((proposal) => {
                    const canHire = ['pending', 'shortlisted'].includes(proposal.status) && !project
                    return (
                      <Cell key={proposal.id}>
                        <div className="flex flex-col gap-1.5">
                          <Button to={`/freelancers/${proposal.freelancerId}`} variant="secondary" size="sm">
                            ดูโปรไฟล์
                          </Button>
                          {proposal.status === 'pending' && (
                            <Button
                              variant="subtle"
                              size="sm"
                              onClick={async () => {
                                await proposalService.updateStatus(proposal.id, 'shortlisted')
                                toast.success('คัดเลือกข้อเสนอแล้ว')
                                proposalQuery.refresh()
                              }}
                            >
                              คัดเลือก
                            </Button>
                          )}
                          {canHire && (
                            <Button variant="brand" size="sm" onClick={() => setConfirm(proposal)}>
                              จ้างงาน
                            </Button>
                          )}
                          {proposal.status === 'hired' && project && (
                            <Button to={`/client/projects/${project.id}`} variant="brand" size="sm">
                              ไปที่โครงการ
                            </Button>
                          )}
                        </div>
                      </Cell>
                    )
                  })}
                </Row>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {chosen.length === 1 && (
        <p className="mt-3 text-center text-[11px] text-ink-400">
          เลือกเพิ่มอีกอย่างน้อย 1 คนเพื่อให้การเปรียบเทียบมีความหมาย
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button to={`/client/jobs/${job.id}/applicants`} variant="secondary" size="md">
          กลับไปดูผู้สมัครทั้งหมด
        </Button>
        {project && (
          <Button to={`/client/projects/${project.id}/escrow`} variant="ghost" size="md">
            ไปที่หน้าจอ Escrow
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={hire}
        loading={hiring}
        title="ยืนยันการจ้างจากตารางเปรียบเทียบ?"
        description={
          confirm
            ? `จ้าง ${confirm.freelancer?.name} ที่ราคา ${formatCurrency(confirm.bidAmount)} — ข้อเสนออื่นจะถูกปฏิเสธใน mock data และสร้างโครงการใหม่`
            : ''
        }
        confirmLabel="ยืนยันการจ้าง"
        tone="brand"
      />
    </div>
  )
}

function Row({ label, children, last }) {
  return (
    <tr className={cn(!last && 'border-b border-ink/[0.05]')}>
      <th
        scope="row"
        className="sticky left-0 z-10 w-40 bg-white px-4 py-3.5 text-[11px] font-semibold text-ink-500"
      >
        {label}
      </th>
      {children}
    </tr>
  )
}

function Cell({ children, highlight = false }) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-top text-ink-600',
        highlight && 'bg-emerald-50/60',
      )}
    >
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </td>
  )
}

function skillScore(proposal, job) {
  const required = job?.skills || []
  const owned = proposal.freelancer?.skills || []
  const count = required.filter((skill) =>
    owned.some((item) => item.toLowerCase() === skill.toLowerCase()),
  ).length
  return { count, total: required.length }
}
