import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Clock3,
  FileText,
  FolderKanban,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { projectService } from '@/services/api/projectService'
import { jobService } from '@/services/api/jobService'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/common/Button'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProgressBar } from '@/components/common/ProgressBar'
import { EmptyState } from '@/components/common/EmptyState'
import { InfoBanner } from '@/components/common/InfoBanner'
import { CardSkeleton, Skeleton } from '@/components/common/LoadingSkeleton'
import { jobStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'

const quickActions = [
  { label: 'สร้างประกาศงาน', description: 'เริ่มหาฟรีแลนซ์คนใหม่', to: '/client/jobs/new', icon: PlusCircle },
  { label: 'ดูผู้สมัคร', description: 'ตรวจข้อเสนอที่เข้ามา', to: '/client/jobs', icon: Users },
  { label: 'ข้อความ', description: 'คุยกับฟรีแลนซ์', to: '/messages', icon: MessageSquare },
  { label: 'กระเป๋าเงิน', description: 'สถานะ escrow และ wallet', to: '/wallet', icon: Wallet },
]

export default function ClientDashboard() {
  useDocumentTitle('แดชบอร์ดลูกค้า')
  const { user, profileId } = useAuth()

  const { data: projects, loading: projectsLoading } = useAsync(
    () => projectService.listProjects({ role: 'client', profileId }),
    [profileId],
  )
  const { data: jobs, loading: jobsLoading } = useAsync(
    () => jobService.listClientJobs(profileId),
    [profileId],
  )

  const projectList = projects || []
  const jobList = jobs || []

  const stats = useMemo(() => {
    const active = projectList.filter((project) => ['active', 'in_review', 'revision'].includes(project.status))
    const openJobs = jobList.filter((job) => job.status === 'open')
    const proposals = jobList.reduce((sum, job) => sum + (job.proposalsCount || 0), 0)
    const escrow = projectList
      .filter((project) => project.escrowStatus === 'funded')
      .reduce((sum, project) => sum + (project.escrowAmount - project.releasedAmount), 0)
    const completed = projectList.filter((project) => project.status === 'completed')
    return { active, openJobs, proposals, escrow, completed }
  }, [projectList, jobList])

  const attention = jobList
    .filter((job) => job.status === 'open' && job.proposalsCount > 0)
    .sort((a, b) => b.proposalsCount - a.proposalsCount)
    .slice(0, 3)

  const reviewQueue = projectList.filter((project) => project.status === 'in_review')

  return (
    <div>
      <PageHeader
        eyebrow="Client workspace"
        title={`สวัสดี ${user?.displayName || user?.name || ''}`}
        description="ภาพรวมงานที่ประกาศ โครงการที่กำลังดำเนินการ และสิ่งที่รอการตัดสินใจของคุณ"
        actions={
          <Button to="/client/jobs/new" variant="brand" size="md" icon={PlusCircle}>
            สร้างประกาศงาน
          </Button>
        }
      />

      <InfoBanner tone="warning" className="mb-6" title="โหมดข้อมูลจำลอง">
        ตัวเลขและรายการทั้งหมดในแดชบอร์ดนี้เป็น mock data — ยังไม่ได้เชื่อมต่อ Backend จริง
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="โครงการที่กำลังดำเนินการ"
          value={projectsLoading ? '—' : stats.active.length}
          hint={`${stats.completed.length} โครงการที่จบแล้ว`}
          icon={FolderKanban}
          tone="brand"
        />
        <StatCard
          label="ประกาศที่เปิดรับ"
          value={jobsLoading ? '—' : stats.openJobs.length}
          hint="รอข้อเสนอจากฟรีแลนซ์"
          icon={Briefcase}
          tone="blue"
        />
        <StatCard
          label="ข้อเสนอที่ได้รับ"
          value={jobsLoading ? '—' : stats.proposals}
          hint="จากทุกประกาศของคุณ"
          icon={FileText}
          tone="violet"
        />
        <StatCard
          label="เงินใน Escrow"
          value={projectsLoading ? '—' : formatCurrency(stats.escrow, { compact: true })}
          hint="คุ้มครองจนกว่าจะตรวจรับ"
          icon={ShieldCheck}
          tone="emerald"
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-3 rounded-xl border border-ink/[0.07] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-ink">{action.label}</span>
                <span className="block text-[10.5px] text-ink-400">{action.description}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </Link>
          )
        })}
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">โครงการล่าสุด</h2>
              <Link
                to="/client/projects"
                className="text-[11.5px] font-semibold text-brand-700 hover:underline"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            {projectsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : projectList.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="ยังไม่มีโครงการ"
                description="เมื่อคุณจ้างฟรีแลนซ์จากข้อเสนอ โครงการจะปรากฏที่นี่"
                action={
                  <Button to="/client/jobs" variant="secondary" size="sm">
                    ไปที่ประกาศงาน
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projectList.slice(0, 2).map((project) => (
                  <ProjectCard key={project.id} project={project} role="client" />
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">ประกาศที่ได้รับความสนใจ</h2>
              <Link to="/client/jobs" className="text-[11.5px] font-semibold text-brand-700 hover:underline">
                จัดการประกาศ →
              </Link>
            </div>

            {jobsLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : attention.length === 0 ? (
              <p className="mt-4 rounded-xl bg-paper px-4 py-5 text-center text-[12.5px] text-ink-500">
                ยังไม่มีข้อเสนอใหม่ — ลองแชร์ประกาศงานหรือปรับรายละเอียดให้ชัดเจนขึ้น
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-ink/[0.06]">
                {attention.map((job) => {
                  const status = jobStatus[job.status]
                  return (
                    <li key={job.id} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/client/jobs/${job.id}/applicants`}
                            className="truncate text-[13px] font-semibold text-ink transition hover:text-brand-700"
                          >
                            {job.title}
                          </Link>
                          {status && <StatusBadge label={status.label} tone={status.tone} />}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-400">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {job.proposalsCount} ข้อเสนอ
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> ประกาศ {formatDate(job.createdAt)}
                          </span>
                          <span>{formatCurrency(job.budgetMin, { compact: true })} – {formatCurrency(job.budgetMax, { compact: true })}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button to={`/client/jobs/${job.id}/applicants`} variant="secondary" size="sm">
                          ดูผู้สมัคร
                        </Button>
                        <Button to={`/client/jobs/${job.id}/compare`} variant="subtle" size="sm">
                          เปรียบเทียบ
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {reviewQueue.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock3 className="h-4 w-4" />
                <h2 className="text-sm font-bold">รอตรวจรับงาน ({reviewQueue.length})</h2>
              </div>
              <div className="mt-3 space-y-2">
                {reviewQueue.map((project) => (
                  <Link
                    key={project.id}
                    to={`/client/projects/${project.id}/review`}
                    className="block rounded-xl border border-amber-200/70 bg-white p-3.5 transition hover:border-amber-300 hover:shadow-sm"
                  >
                    <p className="truncate text-[12.5px] font-semibold text-ink">{project.title}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-500">
                      {project.freelancer?.name} · ส่งเมื่อ {formatDate(project.submissions?.[0]?.submittedAt)}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700">
                      ตรวจงานและอนุมัติ →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Escrow overview</h2>
              <Link to="/wallet" className="text-[10.5px] font-semibold text-brand-700 hover:underline">
                กระเป๋าเงิน →
              </Link>
            </div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
              {formatCurrency(stats.escrow)}
            </p>
            <p className="text-[11px] text-ink-500">เงินที่อยู่ใน escrow ของทุกโครงการ</p>
            <div className="mt-4 space-y-3">
              {projectList
                .filter((project) => project.escrowStatus === 'funded')
                .slice(0, 3)
                .map((project) => (
                  <div key={project.id}>
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="truncate text-ink-600">{project.title}</span>
                      <span className="shrink-0 font-semibold text-ink">{formatCurrency(project.escrowAmount, { compact: true })}</span>
                    </div>
                    <ProgressBar value={project.progress} className="mt-1.5" />
                  </div>
                ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-[10.5px] leading-relaxed text-emerald-800">
                Escrow ในหน้านี้เป็นข้อมูลจำลอง การโอนเงินจริงต้องรอ Smart Contract
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-violet-50/60 p-5">
            <h2 className="text-sm font-bold">เพิ่มโอกาสได้งานที่ดี</h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
              ระบุขอบเขตงานและงบประมาณให้ชัดเจน จะช่วยให้ได้ข้อเสนอที่มีคุณภาพและเปรียบเทียบได้ง่ายขึ้น
            </p>
            <Button to="/client/jobs/new" variant="brand" size="sm" className="mt-3" icon={PlusCircle}>
              สร้างประกาศงานใหม่
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}
