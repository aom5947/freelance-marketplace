import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Send,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { projectService } from '@/services/api/projectService'
import { proposalService } from '@/services/api/proposalService'
import { transactionService } from '@/services/api/transactionService'
import { jobService } from '@/services/api/jobService'
import { profileService } from '@/services/api/profileService'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { JobCard } from '@/components/jobs/JobCard'
import { Avatar } from '@/components/common/Avatar'
import { RatingStars } from '@/components/common/RatingStars'
import { EmptyState } from '@/components/common/EmptyState'
import { InfoBanner } from '@/components/common/InfoBanner'
import { CardSkeleton, Skeleton } from '@/components/common/LoadingSkeleton'
import { availabilityOptions, proposalStatus } from '@/constants'
import { formatCurrency, timeAgo } from '@/utils/format'

export default function FreelancerDashboard() {
  useDocumentTitle('แดชบอร์ดฟรีแลนซ์')
  const { user, profileId } = useAuth()

  const { data: profile } = useAsync(() => profileService.getFreelancer(profileId), [profileId])
  const { data: projects, loading: projectsLoading } = useAsync(
    () => projectService.listProjects({ role: 'freelancer', profileId }),
    [profileId],
  )
  const { data: proposals, loading: proposalsLoading } = useAsync(
    () => proposalService.listByFreelancer(profileId),
    [profileId],
  )
  const { data: transactions } = useAsync(() => transactionService.list(user?.id), [user?.id])
  const { data: openJobs, loading: jobsLoading } = useAsync(
    () => jobService.listJobs({ status: 'open' }),
    [],
  )

  const projectList = projects || []
  const proposalList = proposals || []
  const txList = transactions || []

  const stats = useMemo(() => {
    const earnings = txList
      .filter((tx) => tx.type === 'earning' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const inEscrow = projectList
      .filter((project) => project.escrowStatus === 'funded')
      .reduce((sum, project) => sum + (project.escrowAmount - project.releasedAmount), 0)
    const active = projectList.filter((project) => ['active', 'in_review', 'revision'].includes(project.status))
    const pendingProposals = proposalList.filter((proposal) => ['pending', 'shortlisted'].includes(proposal.status))
    return { earnings, inEscrow, active, pendingProposals }
  }, [txList, projectList, proposalList])

  const recommended = useMemo(() => {
    const skills = (profile?.skills || []).map((skill) => skill.toLowerCase())
    return (openJobs || [])
      .map((job) => ({
        job,
        score: (job.skills || []).filter((skill) => skills.includes(skill.toLowerCase())).length,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.job)
  }, [openJobs, profile])

  const availability = availabilityOptions.find((option) => option.value === profile?.availability)

  return (
    <div>
      <PageHeader
        eyebrow="Freelancer workspace"
        title={`สวัสดี ${user?.name || ''}`}
        description="สรุปงานที่กำลังทำ ข้อเสนอ และรายได้ล่าสุดของคุณ"
        actions={
          <>
            <Button to="/freelancer/profile" variant="secondary" size="md">
              แก้ไขโปรไฟล์
            </Button>
            <Button to="/freelancer/jobs" variant="brand" size="md" icon={Send}>
              ค้นหางาน
            </Button>
          </>
        }
      />

      <InfoBanner tone="warning" className="mb-6" title="โหมดข้อมูลจำลอง">
        รายได้ ข้อเสนอ และโครงการในหน้านี้เป็น mock data — ยังไม่เชื่อมต่อ Backend หรือ Smart Contract
      </InfoBanner>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/[0.07] bg-white p-4">
        <Avatar name={user?.name || 'F'} color={user?.avatarColor} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink">{profile?.title || user?.title}</p>
            {availability && (
              <StatusBadge
                tone={availability.tone}
                label={availability.label}
                pulse={profile?.availability === 'open'}
              />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
            <RatingStars rating={profile?.rating || 0} count={profile?.reviewsCount} showValue />
            <span>{profile?.completedJobs || 0} งานสำเร็จ</span>
            <span>{profile?.successRate || 0}% success rate</span>
            <Link to={`/freelancers/${profileId}`} className="font-semibold text-brand-700 hover:underline">
              ดูโปรไฟล์สาธารณะ →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="รายได้ที่ยืนยันแล้ว"
          value={formatCurrency(stats.earnings, { compact: true })}
          hint="จากธุรกรรม mock"
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          label="เงินรอปล่อยจาก Escrow"
          value={formatCurrency(stats.inEscrow, { compact: true })}
          hint="จะได้รับเมื่อลูกค้าอนุมัติ"
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard
          label="โครงการที่กำลังทำ"
          value={projectsLoading ? '—' : stats.active.length}
          hint={`${projectList.length} โครงการทั้งหมด`}
          icon={BriefcaseBusiness}
          tone="blue"
        />
        <StatCard
          label="ข้อเสนอที่รออยู่"
          value={proposalsLoading ? '—' : stats.pendingProposals.length}
          hint={`${proposalList.length} ข้อเสนอทั้งหมด`}
          icon={FileText}
          tone="violet"
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">โครงการที่กำลังดำเนินการ</h2>
              <Link to="/freelancer/projects" className="text-[11.5px] font-semibold text-brand-700 hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            {projectsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : projectList.filter((p) => ['active', 'revision', 'in_review'].includes(p.status)).length === 0 ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="ยังไม่มีงานที่กำลังทำ"
                description="ส่งข้อเสนอไปยังงานที่ตรงกับทักษะของคุณ แล้วงานที่ได้รับจะแสดงที่นี่"
                action={
                  <Button to="/freelancer/jobs" variant="secondary" size="sm">
                    ค้นหางาน
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projectList
                  .filter((p) => ['active', 'revision', 'in_review'].includes(p.status))
                  .slice(0, 2)
                  .map((project) => (
                    <ProjectCard key={project.id} project={project} role="freelancer" />
                  ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">งานที่แนะนำสำหรับคุณ</h2>
              <Link to="/freelancer/jobs" className="text-[11.5px] font-semibold text-brand-700 hover:underline">
                ดูงานทั้งหมด →
              </Link>
            </div>
            {jobsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : recommended.length === 0 ? (
              <EmptyState
                icon={BriefcaseBusiness}
                title="ยังไม่มีงานที่ตรงกับทักษะตอนนี้"
                description="ลองเพิ่มทักษะในโปรไฟล์ หรือค้นหางานด้วยคำอื่น"
                action={
                  <Button to="/freelancer/profile" variant="secondary" size="sm">
                    อัปเดตทักษะ
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recommended.map((job) => (
                  <JobCard key={job.id} job={job} to={`/freelancer/jobs/${job.id}`} compact />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">ข้อเสนอของฉัน</h2>
              <Link to="/freelancer/proposals" className="text-[10.5px] font-semibold text-brand-700 hover:underline">
                ทั้งหมด →
              </Link>
            </div>
            {proposalsLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : proposalList.length === 0 ? (
              <p className="mt-3 rounded-xl bg-paper px-4 py-4 text-center text-[11.5px] text-ink-500">
                ยังไม่ได้ส่งข้อเสนอ
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {proposalList.slice(0, 3).map((proposal) => {
                  const status = proposalStatus[proposal.status]
                  return (
                    <li key={proposal.id} className="rounded-xl border border-ink/[0.06] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/freelancer/jobs/${proposal.jobId}`}
                          className="line-clamp-1 text-[12px] font-semibold text-ink hover:text-brand-700"
                        >
                          {proposal.job?.title}
                        </Link>
                        <StatusBadge label={status?.label} tone={status?.tone} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-400">
                        <span>{formatCurrency(proposal.bidAmount)} · {proposal.deliveryDays} วัน</span>
                        <span>{timeAgo(proposal.createdAt)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">รายได้ล่าสุด</h2>
              <Link to="/freelancer/earnings" className="text-[10.5px] font-semibold text-brand-700 hover:underline">
                รายได้ →
              </Link>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
              {formatCurrency(stats.earnings)}
            </p>
            <p className="text-[11px] text-ink-500">ยอดรวมจากธุรกรรมที่ยืนยันแล้ว</p>
            <ul className="mt-3 divide-y divide-ink/[0.06]">
              {txList
                .filter((tx) => tx.userId === user?.id)
                .slice(0, 3)
                .map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-ink">{tx.note}</p>
                      <p className="text-[9.5px] text-ink-400">{tx.isMock ? 'mock ledger' : 'on-chain'}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-ink">{formatCurrency(tx.amount)}</span>
                  </li>
                ))}
              {txList.filter((tx) => tx.userId === user?.id).length === 0 && (
                <li className="py-2 text-[11px] text-ink-400">ยังไม่มีรายได้ที่ยืนยันแล้ว</li>
              )}
            </ul>
            <Button to="/freelancer/transactions" variant="secondary" size="sm" className="mt-3 w-full">
              ดูประวัติธุรกรรม
            </Button>
          </section>

          <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-violet-50/60 p-5">
            <h2 className="text-sm font-bold">เพิ่มโอกาสได้งาน</h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
              โปรไฟล์ที่มีผลงานและรีวิวครบจะถูกค้นพบมากขึ้น — อัปเดตทักษะและ portfolio ของคุณ
            </p>
            <Button to="/freelancer/profile" variant="brand" size="sm" className="mt-3" iconRight={ArrowRight}>
              ปรับปรุงโปรไฟล์
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}
