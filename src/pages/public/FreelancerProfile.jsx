import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { profileService } from '@/services/api/profileService'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { RatingStars } from '@/components/common/RatingStars'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSkeleton'
import { availabilityOptions } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'

export default function FreelancerProfile() {
  const { freelancerId } = useParams()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const { data: freelancer, loading, error, refresh } = useAsync(
    () => profileService.getFreelancer(freelancerId),
    [freelancerId],
  )
  useDocumentTitle(freelancer ? `${freelancer.name} — ฟรีแลนซ์` : 'โปรไฟล์ฟรีแลนซ์')

  if (loading) {
    return (
      <div className="pt-[72px]">
        <div className="container-page py-10">
          <Skeleton className="h-48 rounded-3xl" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !freelancer) {
    return (
      <div className="pt-[72px]">
        <div className="container-page py-16">
          <EmptyState
            title="ไม่พบโปรไฟล์ฟรีแลนซ์นี้"
            description="โปรไฟล์อาจถูกซ่อนหรือลบไปแล้ว — ลองกลับไปดูรายชื่อฟรีแลนซ์คนอื่น"
            action={
              <Button to="/freelancers" variant="primary">
                ดูฟรีแลนซ์ทั้งหมด
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const availability = availabilityOptions.find((option) => option.value === freelancer.availability)
  const isOwnProfile = user?.role === 'freelancer' && user.profileId === freelancer.id

  return (
    <div className="pt-[72px]">
      <div className="container-page pt-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ย้อนกลับ
        </button>
      </div>

      <div className="container-page py-6">
        <div className="overflow-hidden rounded-3xl border border-ink/[0.07] bg-white shadow-soft">
          <div className="relative h-36 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 sm:h-44">
            <div className="absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />
            <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-white/20 blur-2xl" aria-hidden="true" />
          </div>
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar
                  name={freelancer.name}
                  color={freelancer.avatarColor}
                  size="2xl"
                  ring
                  className="h-24 w-24 sm:h-28 sm:w-28"
                />
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                      {freelancer.name}
                    </h1>
                    <BadgeCheck className="h-5 w-5 text-brand-500" aria-label="ยืนยันตัวตนแล้ว" />
                    {availability && (
                      <StatusBadge
                        tone={availability.tone}
                        label={availability.label}
                        pulse={freelancer.availability === 'open'}
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-ink-600">{freelancer.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {freelancer.location}
                    </span>
                    <RatingStars rating={freelancer.rating} count={freelancer.reviewsCount} showValue />
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" /> ตอบกลับ {freelancer.responseTime}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pb-1">
                {isOwnProfile ? (
                  <Button to="/freelancer/profile" variant="secondary" size="md">
                    แก้ไขโปรไฟล์ของฉัน
                  </Button>
                ) : isAuthenticated && user?.role === 'client' ? (
                  <>
                    <Button to="/client/jobs/new" variant="brand" size="md">
                      โพสต์งานเพื่อจ้าง
                    </Button>
                    <Button to="/messages" variant="secondary" size="md" icon={MessageSquare}>
                      ข้อความ
                    </Button>
                  </>
                ) : (
                  <Button
                    to="/login"
                    state={{ from: location.pathname }}
                    variant="brand"
                    size="md"
                    icon={MessageSquare}
                  >
                    เข้าสู่ระบบเพื่อจ้างงาน
                  </Button>
                )}
                <Button to="/jobs" variant="secondary" size="md">
                  ดูงานที่เปิดรับ
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="card p-6">
              <h2 className="text-base font-bold">เกี่ยวกับฟรีแลนซ์</h2>
              <p className="mt-3 text-[13.5px] leading-[1.85] text-ink-600">{freelancer.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {freelancer.skills.map((skill) => (
                  <span key={skill} className="rounded-lg border border-ink/[0.07] bg-paper-soft px-2.5 py-1 text-[11.5px] font-medium text-ink-600">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/[0.06] pt-4 text-[11.5px] text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" /> {freelancer.languages?.join(' · ')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> เข้าร่วมเมื่อ {formatDate(freelancer.memberSince, { month: 'long' })}
                </span>
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">ผลงานที่เลือกมา</h2>
                <span className="text-[11px] text-ink-400">{freelancer.portfolio?.length || 0} ผลงาน</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(freelancer.portfolio || []).map((work) => (
                  <article key={work.id} className="group overflow-hidden rounded-xl border border-ink/[0.07]">
                    <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${work.accent}`}>
                      <div className="absolute inset-0 bg-grid-dark opacity-30" aria-hidden="true" />
                      <Briefcase className="h-8 w-8 text-white/80" aria-hidden="true" />
                      <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
                        {work.category}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-[13px] font-bold text-ink">{work.title}</h3>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{work.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold">รีวิวจากลูกค้า</h2>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-ink">{freelancer.rating}</span>
                  <div>
                    <RatingStars rating={freelancer.rating} size="sm" />
                    <p className="text-[10px] text-ink-400">{freelancer.reviewsCount} รีวิว</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {(freelancer.reviews || []).length === 0 ? (
                  <p className="text-sm text-ink-500">ยังไม่มีรีวิวสำหรับฟรีแลนซ์คนนี้</p>
                ) : (
                  freelancer.reviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-ink/[0.06] bg-paper-soft/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={review.client?.name || 'Client'}
                            color={review.client?.avatarColor}
                            size="sm"
                          />
                          <div>
                            <p className="text-xs font-bold text-ink">{review.client?.name}</p>
                            <p className="text-[10px] text-ink-400">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                        <RatingStars rating={review.rating} size="xs" />
                      </div>
                      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">{review.comment}</p>
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-400">
                        <span>คุณภาพ {review.criteria?.quality}/5</span>
                        <span>การสื่อสาร {review.criteria?.communication}/5</span>
                        <span>ตรงเวลา {review.criteria?.deadline}/5</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">อัตราค่าจ้าง</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">
                {formatCurrency(freelancer.hourlyRate)}
                <span className="text-sm font-medium text-ink-400"> / ชั่วโมง</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/[0.07] pt-4">
                <div>
                  <p className="text-lg font-bold text-ink">{freelancer.completedJobs}</p>
                  <p className="text-[10px] text-ink-400">งานที่สำเร็จ</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{freelancer.successRate}%</p>
                  <p className="text-[10px] text-ink-400">อัตราความสำเร็จ</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-ink">{freelancer.reviewsCount}</p>
                  <p className="text-[10px] text-ink-400">รีวิว</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-ink">8 ปี</p>
                  <p className="text-[10px] text-ink-400">ประสบการณ์</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-[10.5px] leading-relaxed text-emerald-800">
                  จ้างผ่าน Freelink เพื่อให้มีบันทึกข้อตกลงและ escrow คุ้มครอง
                </p>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold">จ้างงานอย่างไรให้ปลอดภัย</h2>
              <ul className="mt-3 space-y-2.5">
                {[
                  'ตกลงขอบเขตงานและ milestone ให้ชัด',
                  'ฝากเงินเข้า escrow ก่อนเริ่มงาน',
                  'ตรวจงานและขอแก้ไขได้ตามข้อตกลง',
                  'อนุมัติจ่ายเมื่อพอใจกับผลงาน',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/how-it-works"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
              >
                เรียนรู้เพิ่มเติม →
              </Link>
            </div>

            <InfoBanner tone="warning" title="โปรไฟล์ตัวอย่าง">
              ข้อมูล ผลงาน และรีวิวทั้งหมดเป็น mock data
            </InfoBanner>

            <div className="hidden items-center gap-2 text-[10px] text-ink-400 sm:flex">
              <Wallet className="h-3 w-3" />
              การจ่ายเงินจริงจะเริ่มเมื่อเชื่อมต่อ Smart Contract
              <Star className="ml-auto h-3 w-3 text-amber-400" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
