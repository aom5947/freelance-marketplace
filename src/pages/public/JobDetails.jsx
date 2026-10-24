import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { RatingStars } from '@/components/common/RatingStars'
import { InfoBanner } from '@/components/common/InfoBanner'
import { JobCard } from '@/components/jobs/JobCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { jobService } from '@/services/api/jobService'
import { proposalService } from '@/services/api/proposalService'
import { categoryMap, experienceLevels, jobStatus, proposalStatus } from '@/constants'
import { formatCurrency, formatDate, timeAgo } from '@/utils/format'

export default function JobDetails() {
  const { jobId } = useParams()
  const location = useLocation()
  const detailBase = location.pathname.startsWith('/freelancer') ? '/freelancer/jobs' : '/jobs'
  const { user, isAuthenticated } = useAuth()
  const toast = useToast()
  const { isSaved, toggle } = useSavedJobs()
  const [savedBurst, setSavedBurst] = useState(false)

  const { data: job, loading, error, refresh } = useAsync(
    () => jobService.getJob(jobId),
    [jobId],
  )
  useDocumentTitle(job?.title || 'รายละเอียดงาน')

  const { data: allJobs } = useAsync(() => jobService.listJobs({ status: 'open' }), [])
  const { data: myProposals } = useAsync(
    () =>
      user?.role === 'freelancer'
        ? proposalService.listByFreelancer(user.profileId)
        : Promise.resolve([]),
    [user?.role, user?.profileId],
  )

  const myProposal = useMemo(
    () => (myProposals || []).find((proposal) => proposal.jobId === jobId),
    [myProposals, jobId],
  )

  const similar = useMemo(
    () =>
      (allJobs || [])
        .filter((item) => item.category === job?.category && item.id !== job?.id)
        .slice(0, 2),
    [allJobs, job],
  )

  const isOwner = user?.role === 'client' && job && user.profileId === job.clientId
  const isFreelancer = user?.role === 'freelancer'
  const saved = job ? isSaved(job.id) : false
  const status = job ? jobStatus[job.status] : null
  const category = job ? categoryMap[job.category] : null
  const CategoryIcon = category?.icon
  const experience = experienceLevels.find((level) => level.value === job?.experience)

  const handleSave = () => {
    toggle(job.id)
    setSavedBurst(true)
    setTimeout(() => setSavedBurst(false), 900)
    toast.info(
      saved ? 'นำออกจากรายการที่บันทึกแล้ว' : 'บันทึกงานไว้ในเครื่องแล้ว',
      'รายการที่บันทึกเก็บใน localStorage — จะซิงก์กับบัญชีเมื่อเชื่อม Backend',
    )
  }

  if (loading) {
    return (
      <div className="pt-[72px]">
        <div className="container-page py-10">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-6 h-10 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !job) {
    const notFound = error?.code === 'NOT_FOUND'
    return (
      <div className="pt-[72px]">
        <div className="container-page py-16">
          {notFound ? (
            <EmptyState
              title="ไม่พบประกาศงานนี้"
              description="อาจถูกลบหรือปิดรับไปแล้ว — ลองกลับไปดูประกาศงานอื่นที่ยังเปิดรับอยู่"
              action={
                <Button to="/jobs" variant="primary">
                  ดูประกาศงานทั้งหมด
                </Button>
              }
            />
          ) : (
            <ErrorState error={error} onRetry={refresh} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pt-[72px]">
      <div className="border-b border-ink/[0.06] bg-white">
        <div className="container-page py-7 sm:py-9">
          <Link
            to={location.pathname.startsWith('/freelancer') ? '/freelancer/jobs' : '/jobs'}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            กลับไปหน้าค้นหางาน
          </Link>

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-1.5">
                {status && <StatusBadge label={status.label} tone={status.tone} pulse={job.status === 'open'} />}
                <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-600">
                  {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
                  {category?.label}
                </span>
                {job.escrowProtected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    Escrow protected
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[32px]">
                {job.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" /> ประกาศ {timeAgo(job.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.client?.location || 'ไม่ระบุ'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {job.proposalsCount} ข้อเสนอ
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> กำหนดส่ง {formatDate(job.deadline)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-xl border border-ink/10 bg-white px-3.5 text-xs font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
              aria-pressed={saved}
            >
              {saved ? (
                <BookmarkCheck className={`h-4 w-4 text-brand-600 ${savedBurst ? 'scale-110' : ''} transition`} />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {saved ? 'บันทึกแล้ว' : 'บันทึกงาน'}
            </button>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_356px]">
          <div className="min-w-0 space-y-5">
            <section className="card p-6">
              <h2 className="text-base font-bold">รายละเอียดงาน</h2>
              <p className="mt-3 whitespace-pre-line text-[13.5px] leading-[1.85] text-ink-600">
                {job.description}
              </p>
            </section>

            {job.deliverables?.length > 0 && (
              <section className="card p-6">
                <h2 className="text-base font-bold">สิ่งที่ต้องส่งมอบ</h2>
                <ul className="mt-3 space-y-2">
                  {job.deliverables.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-ink-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card p-6">
              <h2 className="text-base font-bold">ทักษะที่ต้องการ</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span key={skill} className="rounded-lg border border-ink/[0.07] bg-paper-soft px-2.5 py-1 text-[11.5px] font-medium text-ink-600">
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">เกี่ยวกับลูกค้า</h2>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={job.client?.name || 'Client'} color={job.client?.avatarColor} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-ink">{job.client?.name}</p>
                    {job.client?.verified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">
                        <ShieldCheck className="h-2.5 w-2.5" /> ยืนยันแล้ว
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500">{job.client?.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-ink-500">
                    <RatingStars rating={job.client?.rating || 0} count={job.client?.reviews} />
                    <span>{job.client?.jobsPosted} งานที่ประกาศ</span>
                    <span>จ้างสำเร็จ {job.client?.hireRate}%</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">
                {job.client?.bio}
              </p>
            </section>

            {similar.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">งานที่คล้ายกัน</h2>
                  <Link to="/jobs" className="text-[11px] font-semibold text-brand-700 hover:underline">
                    ดูทั้งหมด
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {similar.map((item) => (
                    <JobCard key={item.id} job={item} to={`${detailBase}/${item.id}`} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <div className="card p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                งบประมาณ
              </p>
              <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">
                {formatCurrency(job.budgetMin, { compact: true })}
                <span className="mx-1.5 text-base font-normal text-ink-300">–</span>
                {formatCurrency(job.budgetMax, { compact: true })}
              </p>
              <p className="mt-1 text-[11px] text-ink-500">
                {job.budgetType === 'hourly' ? 'คิดตามชั่วโมงจริง' : 'ราคาเหมารวม'} · {job.duration}
              </p>

              <div className="mt-5 space-y-2.5 border-t border-ink/[0.07] pt-4 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-ink-500">
                    <GraduationCap className="h-3.5 w-3.5" /> ระดับประสบการณ์
                  </span>
                  <span className="font-semibold text-ink">{experience?.label || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-ink-500">
                    <CalendarDays className="h-3.5 w-3.5" /> กำหนดส่ง
                  </span>
                  <span className="font-semibold text-ink">{formatDate(job.deadline)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-ink-500">
                    <ShieldCheck className="h-3.5 w-3.5" /> การชำระเงิน
                  </span>
                  <span className="font-semibold text-emerald-600">Escrow</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {isOwner ? (
                  <>
                    <Button to={`/client/jobs/${job.id}/applicants`} variant="brand" size="md" className="w-full">
                      ดูผู้สมัคร {job.proposalsCount} ราย
                    </Button>
                    <Button to={`/client/jobs/${job.id}/compare`} variant="secondary" size="md" className="w-full">
                      เปรียบเทียบข้อเสนอ
                    </Button>
                  </>
                ) : isFreelancer ? (
                  myProposal ? (
                    <>
                      <InfoBanner tone="info" title="คุณส่งข้อเสนอสำหรับงานนี้แล้ว">
                        <span className="inline-flex items-center gap-1">
                          สถานะ:
                          <StatusBadge
                            label={proposalStatus[myProposal.status]?.label}
                            tone={proposalStatus[myProposal.status]?.tone}
                          />
                        </span>
                      </InfoBanner>
                      <Button to="/freelancer/proposals" variant="secondary" size="md" className="w-full">
                        ดูข้อเสนอของฉัน
                      </Button>
                    </>
                  ) : job.status === 'open' ? (
                    <Button
                      to={`/freelancer/proposals/new/${job.id}`}
                      variant="brand"
                      size="md"
                      className="w-full"
                      icon={Send}
                    >
                      ส่งข้อเสนอ
                    </Button>
                  ) : (
                    <InfoBanner tone="warning" title="ประกาศนี้ปิดรับข้อเสนอแล้ว" />
                  )
                ) : isAuthenticated && user?.role === 'client' ? (
                  <InfoBanner tone="info" title="บัญชีลูกค้าไม่สามารถส่งข้อเสนอได้">
                    หากต้องการรับงานนี้ กรุณาใช้งานในบทบาทฟรีแลนซ์
                  </InfoBanner>
                ) : (
                  <>
                    <Button
                      to="/login"
                      state={{ from: location.pathname }}
                      variant="brand"
                      size="md"
                      className="w-full"
                      icon={Send}
                    >
                      เข้าสู่ระบบเพื่อส่งข้อเสนอ
                    </Button>
                    <p className="text-center text-[10.5px] text-ink-400">
                      ยังไม่มีบัญชี?{' '}
                      <Link to="/register" className="font-semibold text-brand-700 hover:underline">
                        สมัครเป็นฟรีแลนซ์
                      </Link>
                    </p>
                  </>
                )}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-paper-soft p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-[10.5px] leading-relaxed text-ink-500">
                  เงินของลูกค้าจะถูกเก็บใน escrow และปล่อยเมื่อตรวจรับงาน
                  — หน้าจอชำระเงินยังรอการเชื่อมต่อ Smart Contract
                </p>
              </div>
            </div>

            <InfoBanner tone="warning" className="mt-3" title="ข้อมูลจำลอง">
              ประกาศงานนี้เป็น mock data สำหรับทดสอบ UI และ workflow เท่านั้น
            </InfoBanner>
          </aside>
        </div>
      </div>
    </div>
  )
}
