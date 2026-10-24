import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { projectService } from '@/services/api/projectService'
import { transactionService } from '@/services/api/transactionService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Avatar } from '@/components/common/Avatar'
import { RatingStars } from '@/components/common/RatingStars'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProgressBar } from '@/components/common/ProgressBar'
import { InfoBanner } from '@/components/common/InfoBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { escrowStatus, projectStatus, transactionTypes } from '@/constants'
import { formatCurrency, formatDate, timeAgo, truncate } from '@/utils/format'
import { cn } from '@/utils/cn'

const milestoneIcon = {
  completed: CheckCircle2,
  in_progress: Clock3,
  pending: Circle,
}

export default function ProjectDetails() {
  const { projectId } = useParams()
  const { user, role, profileId } = useAuth()
  const { data: project, loading, error, refresh } = useAsync(
    () => projectService.getProject(projectId),
    [projectId],
  )
  useDocumentTitle(project ? project.title : 'รายละเอียดโครงการ')

  const { data: transactions } = useAsync(
    () => transactionService.list(user?.id),
    [user?.id],
  )

  const [tab, setTab] = useState('milestones')

  const projectTx = useMemo(
    () => (transactions || []).filter((transaction) => transaction.projectId === projectId),
    [transactions, projectId],
  )

  if (loading) return <PageLoader />
  if (error || !project) return <ErrorState error={error} onRetry={refresh} />

  const isParticipant =
    (role === 'client' && project.clientId === profileId) ||
    (role === 'freelancer' && project.freelancerId === profileId)

  if (!isParticipant) {
    return (
      <EmptyState
        title="คุณไม่มีสิทธิ์เข้าถึงโครงการนี้"
        description="โครงการนี้ไม่ได้ผูกกับบัญชีของคุณ"
        action={
          <Button to={role === 'client' ? '/client/projects' : '/freelancer/projects'} variant="primary">
            กลับไปโครงการของฉัน
          </Button>
        }
      />
    )
  }

  const status = projectStatus[project.status]
  const escrow = escrowStatus[project.escrowStatus]
  const counterpart = role === 'client' ? project.freelancer : project.client
  const isClient = role === 'client'
  const funded = project.escrowStatus !== 'unfunded'
  const latestSubmission = project.submissions?.[0]

  return (
    <div>
      <PageHeader
        eyebrow="Project workspace"
        title={project.title}
        description={`เริ่มเมื่อ ${formatDate(project.startDate)} · กำหนดส่ง ${formatDate(project.dueDate)}`}
        backTo={isClient ? '/client/projects' : '/freelancer/projects'}
        backLabel="กลับไปโครงการทั้งหมด"
        actions={
          <>
            <StatusBadge label={status?.label} tone={status?.tone} pulse={project.status === 'active'} />
            <StatusBadge label={escrow?.label} tone={escrow?.tone} />
          </>
        }
      />

      {!funded && (
        <InfoBanner tone="warning" className="mb-5" title="Escrow ยังไม่ถูกฝากเงิน">
          {isClient
            ? 'คุณต้องฝากเงินเข้า escrow ก่อนที่ฟรีแลนซ์จะเริ่มงาน — การฝากจริงต้องรอเชื่อมต่อ Smart Contract'
            : 'รอลูกค้าฝากเงินเข้า escrow ก่อนเริ่มงาน — คุณสามารถดูรายละเอียดและคุยกับลูกค้าได้ระหว่างนี้'}
        </InfoBanner>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Overall progress
                </p>
                <p className="mt-1 text-2xl font-extrabold text-ink">{project.progress}%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-ink-400">มูลค่าโครงการ</p>
                <p className="text-sm font-bold text-ink">{formatCurrency(project.budget)}</p>
              </div>
            </div>
            <ProgressBar value={project.progress} className="mt-3" />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Milestones', value: project.milestones?.length || 0 },
                {
                  label: 'เสร็จแล้ว',
                  value: (project.milestones || []).filter((item) => item.status === 'completed').length,
                },
                { label: 'การส่งงาน', value: project.submissions?.length || 0 },
                { label: 'ธุรกรรม', value: projectTx.length },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-paper px-3 py-2">
                  <p className="text-sm font-bold text-ink">{item.value}</p>
                  <p className="text-[10px] text-ink-400">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-1 rounded-xl border border-ink/[0.07] bg-white p-1">
            {[
              { value: 'milestones', label: 'Milestones' },
              { value: 'submissions', label: 'งานที่ส่ง' },
              { value: 'transactions', label: 'ธุรกรรม' },
              { value: 'brief', label: 'โจทย์งาน' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  'flex-1 rounded-lg px-2 py-2 text-[11.5px] font-semibold transition',
                  tab === item.value ? 'bg-ink text-white shadow-sm' : 'text-ink-500 hover:bg-paper',
                )}
                aria-pressed={tab === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'milestones' && (
            <section className="card p-5">
              <h2 className="text-sm font-bold">Milestones</h2>
              <ol className="mt-4 space-y-0">
                {(project.milestones || []).map((milestone, index) => {
                  const Icon = milestoneIcon[milestone.status] || Circle
                  const done = milestone.status === 'completed'
                  const active = milestone.status === 'in_progress'
                  return (
                    <li key={milestone.id} className="relative flex gap-3 pb-6 last:pb-0">
                      {index < project.milestones.length - 1 && (
                        <span className="absolute left-[11px] top-6 h-full w-px bg-ink/[0.08]" aria-hidden="true" />
                      )}
                      <span
                        className={cn(
                          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                          done
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                            : active
                              ? 'border-amber-200 bg-amber-50 text-amber-600'
                              : 'border-ink/10 bg-white text-ink-300',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className={cn('text-[12.5px] font-semibold', done ? 'text-ink' : 'text-ink-600')}>
                            {milestone.title}
                          </p>
                          <span className="text-[11px] font-semibold text-ink">{formatCurrency(milestone.amount)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-ink-400">
                          <span>กำหนด {formatDate(milestone.dueDate)}</span>
                          <StatusBadge
                            label={done ? 'เสร็จแล้ว' : active ? 'กำลังทำ' : 'รอดำเนินการ'}
                            tone={done ? 'emerald' : active ? 'amber' : 'slate'}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          {tab === 'submissions' && (
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">งานที่ส่งเข้ามา</h2>
                {isClient && latestSubmission && project.status === 'in_review' && (
                  <Button to={`/client/projects/${project.id}/review`} variant="brand" size="sm">
                    ตรวจรับงาน
                  </Button>
                )}
              </div>
              {(project.submissions || []).length === 0 ? (
                <p className="mt-3 rounded-xl bg-paper px-4 py-6 text-center text-[12px] text-ink-500">
                  ยังไม่มีการส่งงาน — {isClient ? 'รอฟรีแลนซ์ส่งมอบงาน' : 'คุณสามารถส่งงานได้จากปุ่มด้านขวา'}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {project.submissions.map((submission) => (
                    <li key={submission.id} className="rounded-xl border border-ink/[0.07] bg-paper-soft/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[12.5px] font-bold text-ink">{submission.title}</p>
                          <p className="mt-0.5 text-[10px] text-ink-400">ส่งเมื่อ {timeAgo(submission.submittedAt)}</p>
                        </div>
                        <StatusBadge
                          label={
                            submission.status === 'approved'
                              ? 'อนุมัติแล้ว'
                              : submission.status === 'revision'
                                ? 'ขอแก้ไข'
                                : 'รอตรวจรับ'
                          }
                          tone={
                            submission.status === 'approved'
                              ? 'emerald'
                              : submission.status === 'revision'
                                ? 'rose'
                                : 'amber'
                          }
                        />
                      </div>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-600">{submission.description}</p>
                      {submission.link && (
                        <a
                          href={submission.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          เปิดลิงก์งาน
                        </a>
                      )}
                      {submission.feedback && (
                        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[10.5px] leading-relaxed text-ink-500">
                          <span className="font-semibold text-ink">Feedback:</span> {submission.feedback}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'transactions' && (
            <section className="card p-5">
              <h2 className="text-sm font-bold">ธุรกรรมของโครงการ</h2>
              {projectTx.length === 0 ? (
                <p className="mt-3 rounded-xl bg-paper px-4 py-6 text-center text-[12px] text-ink-500">
                  ยังไม่มีธุรกรรมสำหรับโครงการนี้
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-ink/[0.06]">
                  {projectTx.map((transaction) => (
                    <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-ink">
                          {transactionTypes[transaction.type] || transaction.type}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-ink-400">{transaction.note}</p>
                        <p className="mt-0.5 text-[9.5px] text-ink-300">
                          {formatDate(transaction.createdAt)} · {transaction.isMock ? 'mock ledger' : 'on-chain'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-bold text-ink">{formatCurrency(transaction.amount)}</p>
                        <Link
                          to={`/transactions/${transaction.id}`}
                          className="text-[10px] font-semibold text-brand-700 hover:underline"
                        >
                          ดูรายละเอียด
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'brief' && (
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">โจทย์งาน</h2>
                {project.job && (
                  <Link
                    to={`/jobs/${project.jobId}`}
                    className="text-[11px] font-semibold text-brand-700 hover:underline"
                  >
                    ดูประกาศงานเต็ม →
                  </Link>
                )}
              </div>
              <p className="mt-3 whitespace-pre-line text-[12.5px] leading-[1.85] text-ink-600">
                {project.job?.description || 'ไม่พบรายละเอียดโจทย์งาน'}
              </p>
              {project.job?.skills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.job.skills.map((skill) => (
                    <span key={skill} className="rounded-md bg-paper px-2 py-0.5 text-[10.5px] text-ink-500">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold">{isClient ? 'ฟรีแลนซ์' : 'ลูกค้า'}</h2>
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar name={counterpart?.name || '—'} color={counterpart?.avatarColor} size="md" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">{counterpart?.name || '—'}</p>
                <p className="truncate text-[10.5px] text-ink-500">
                  {counterpart?.title || counterpart?.contactName}
                </p>
                <RatingStars rating={counterpart?.rating || 0} size="xs" showValue />
              </div>
            </div>
            <Button to="/messages" variant="secondary" size="sm" className="mt-3 w-full" icon={MessageSquare}>
              ส่งข้อความ
            </Button>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold">สัญญา & การชำระเงิน</h2>
            <div className="mt-3 space-y-2.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">มูลค่างาน</span>
                <span className="font-bold text-ink">{formatCurrency(project.budget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Escrow</span>
                <StatusBadge label={escrow?.label} tone={escrow?.tone} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">ฝากแล้ว</span>
                <span className="font-semibold text-ink">{formatCurrency(project.escrowAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">ปล่อยแล้ว</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(project.releasedAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">กำหนดส่ง</span>
                <span className="font-semibold text-ink">{formatDate(project.dueDate)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50/70 px-3 py-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <p className="text-[10px] leading-relaxed text-emerald-800">
                สถานะ payment เป็นข้อมูลจำลอง — การโอนจริงต้องรอ Smart Contract
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold">การดำเนินการ</h2>
            <div className="mt-3 space-y-2">
              {isClient ? (
                <>
                  {!funded && project.status === 'active' && (
                    <Button
                      to={`/client/projects/${project.id}/escrow`}
                      variant="brand"
                      size="md"
                      className="w-full"
                      icon={Wallet}
                    >
                      ฝากเงินเข้า Escrow
                    </Button>
                  )}
                  {project.status === 'in_review' && (
                    <Button
                      to={`/client/projects/${project.id}/review`}
                      variant="brand"
                      size="md"
                      className="w-full"
                      icon={FileCheck2}
                    >
                      ตรวจรับงาน
                    </Button>
                  )}
                  {project.status === 'revision' && (
                    <InfoBanner tone="warning" title="รอฟรีแลนซ์แก้ไขงาน" />
                  )}
                  {project.status === 'completed' && (
                    <>
                      <Button to="/client/history" variant="secondary" size="md" className="w-full">
                        ดูประวัติการจ้าง
                      </Button>
                      <Button to="/messages" variant="ghost" size="md" className="w-full">
                        ขอบคุณฟรีแลนซ์
                      </Button>
                    </>
                  )}
                  <Button
                    to={`/client/projects/${project.id}/escrow`}
                    variant="secondary"
                    size="md"
                    className="w-full"
                    icon={Wallet}
                  >
                    ดูสถานะ Escrow
                  </Button>
                </>
              ) : (
                <>
                  {['active', 'revision'].includes(project.status) && (
                    <Button
                      to={`/freelancer/projects/${project.id}/submit`}
                      variant="brand"
                      size="md"
                      className="w-full"
                      icon={Send}
                      disabled={!funded}
                      title={!funded ? 'รอลูกค้าฝากเงินเข้า escrow ก่อน' : undefined}
                    >
                      {project.status === 'revision' ? 'แก้ไขและส่งงานใหม่' : 'ส่งงาน'}
                    </Button>
                  )}
                  {project.status === 'in_review' && (
                    <InfoBanner tone="info" title="ส่งงานแล้ว — รอลูกค้าตรวจรับ" />
                  )}
                  {project.status === 'completed' && (
                    <Button to="/freelancer/earnings" variant="brand" size="md" className="w-full" icon={Wallet}>
                      ดูรายได้
                    </Button>
                  )}
                  <Button to="/freelancer/earnings" variant="secondary" size="md" className="w-full">
                    สรุปการชำระเงิน
                  </Button>
                </>
              )}
            </div>
            {latestSubmission && (
              <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[10px] leading-relaxed text-ink-500">
                งานล่าสุด: <span className="font-semibold text-ink">{truncate(latestSubmission.title, 60)}</span>
              </p>
            )}
          </div>

          <InfoBanner tone="warning" title="ข้อมูลจำลอง">
            ความคืบหน้าและประวัติธุรกรรมทั้งหมดเป็น mock data
          </InfoBanner>
        </aside>
      </div>
    </div>
  )
}
