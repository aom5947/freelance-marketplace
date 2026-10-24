import { useEffect, useState } from 'react'
import { CheckCircle2, History, Star, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { projectService } from '@/services/api/projectService'
import { profileService } from '@/services/api/profileService'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Modal } from '@/components/common/Modal'
import { Textarea } from '@/components/common/FormField'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function HiringHistory() {
  useDocumentTitle('ประวัติการจ้าง')
  const { profileId } = useAuth()
  const toast = useToast()
  const { data, loading, error, refresh } = useAsync(
    () => projectService.listProjects({ role: 'client', profileId }),
    [profileId],
  )

  const [reviewTarget, setReviewTarget] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewedProjects, setReviewedProjects] = useState(new Set())

  const completed = (data || []).filter((project) => project.status === 'completed')
  const totalSpent = completed.reduce((sum, project) => sum + project.releasedAmount, 0)

  useEffect(() => {
    let active = true
    const freelancerIds = [...new Set(completed.map((project) => project.freelancerId))]
    if (freelancerIds.length === 0) return undefined
    Promise.all(freelancerIds.map((id) => profileService.listReviews(id)))
      .then((groups) => {
        if (!active) return
        const ids = new Set()
        groups.flat().forEach((review) => {
          if (review.projectId && review.clientId === profileId) ids.add(review.projectId)
        })
        setReviewedProjects(ids)
      })
      .catch(() => {})
    return () => {
      active = false
    }
    // Reviews only need to load when the completed set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed.length, profileId])

  const openReview = (project) => {
    setReviewTarget(project)
    setRating(5)
    setComment('')
    setCommentError('')
  }

  const submitReview = async () => {
    if (comment.trim().length < 10) {
      setCommentError('กรุณาเขียนรีวิวอย่างน้อย 10 ตัวอักษร')
      return
    }
    setBusy(true)
    try {
      await profileService.addReview({
        freelancerId: reviewTarget.freelancerId,
        clientId: profileId,
        projectId: reviewTarget.id,
        rating,
        comment: comment.trim(),
      })
      setReviewedProjects((current) => new Set(current).add(reviewTarget.id))
      toast.success('บันทึกรีวิวแล้ว', 'รีวิวถูกเพิ่มใน mock data และจะแสดงบนโปรไฟล์ฟรีแลนซ์')
      setReviewTarget(null)
      refresh()
    } catch (err) {
      toast.error('บันทึกรีวิวไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Hiring history"
        title="ประวัติการจ้างงาน"
        description="โครงการที่เสร็จสิ้น มูลค่าที่จ่ายไป และรีวิวที่คุณให้ฟรีแลนซ์"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="โครงการที่เสร็จสิ้น"
          value={loading ? '—' : completed.length}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="ยอดจ่ายทั้งหมด"
          value={loading ? '—' : formatCurrency(totalSpent, { compact: true })}
          hint="จาก escrow ที่ปล่อยแล้ว (mock)"
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="รีวิวที่ให้ไป"
          value={loading ? '—' : reviewedProjects.size}
          hint="ช่วยให้ชุมชนมีข้อมูลคุณภาพ"
          icon={Star}
          tone="amber"
        />
      </div>

      <InfoBanner tone="warning" className="my-5" title="ประวัติจำลอง">
        รายการทั้งหมดเป็นข้อมูลตัวอย่าง และรีวิวที่ส่งจะถูกเก็บใน mock database ของเบราว์เซอร์
      </InfoBanner>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : completed.length === 0 ? (
        <EmptyState
          icon={History}
          title="ยังไม่มีประวัติการจ้างงาน"
          description="เมื่อโครงการแรกเสร็จสิ้นและอนุมัติจ่ายเงิน ประวัติจะแสดงที่นี่"
          action={
            <Button to="/client/jobs" variant="secondary">
              ดูประกาศงาน
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[2.2fr_1.2fr_1fr_1fr_1.4fr] gap-4 border-b border-ink/[0.06] bg-paper-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid">
            <span>โครงการ</span>
            <span>ฟรีแลนซ์</span>
            <span>มูลค่า</span>
            <span>เสร็จสิ้น</span>
            <span className="text-right">การจัดการ</span>
          </div>
          <ul className="divide-y divide-ink/[0.06]">
            {completed.map((project) => {
              const reviewed = reviewedProjects.has(project.id)
              return (
                <li
                  key={project.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[2.2fr_1.2fr_1fr_1fr_1.4fr] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-[13px] font-semibold text-ink">{project.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusBadge label="เสร็จสิ้น" tone="emerald" />
                      <span className="text-[10px] text-ink-400">escrow released</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={project.freelancer?.name || 'F'}
                      color={project.freelancer?.avatarColor}
                      size="xs"
                    />
                    <span className="truncate text-[11.5px] font-medium text-ink-600">
                      {project.freelancer?.name}
                    </span>
                  </div>
                  <div className="text-[11.5px] font-semibold text-ink">
                    {formatCurrency(project.releasedAmount || project.budget)}
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {formatDate(project.completedAt || project.dueDate)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                    <Button to={`/client/projects/${project.id}`} variant="ghost" size="sm">
                      ดูโครงการ
                    </Button>
                    <Button
                      variant={reviewed ? 'secondary' : 'subtle'}
                      size="sm"
                      icon={Star}
                      onClick={() => openReview(project)}
                      disabled={reviewed}
                    >
                      {reviewed ? 'รีวิวแล้ว' : 'ให้รีวิว'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="ให้คะแนนและรีวิว"
        description={reviewTarget?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button variant="brand" onClick={submitReview} loading={busy}>
              ส่งรีวิว
            </Button>
          </>
        }
      >
        {reviewTarget && (
          <div>
            <div className="flex items-center gap-2.5 rounded-xl bg-paper p-3">
              <Avatar
                name={reviewTarget.freelancer?.name || 'F'}
                color={reviewTarget.freelancer?.avatarColor}
                size="sm"
              />
              <div>
                <p className="text-xs font-bold text-ink">{reviewTarget.freelancer?.name}</p>
                <p className="text-[10px] text-ink-500">{reviewTarget.freelancer?.title}</p>
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className="field-label">คะแนนโดยรวม</legend>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="rounded-md p-1 transition hover:scale-110"
                    aria-label={`ให้ ${value} ดาว`}
                    aria-pressed={rating === value}
                  >
                    <Star
                      className={cn(
                        'h-7 w-7',
                        value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-ink">{rating}.0</span>
              </div>
            </fieldset>

            <div className="mt-3">
              <Textarea
                label="ความคิดเห็น"
                rows={4}
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)
                  setCommentError('')
                }}
                error={commentError}
                placeholder="เล่าประสบการณ์การทำงาน คุณภาพงาน และการสื่อสาร…"
                required
              />
            </div>
            <p className="mt-2 text-[10px] text-ink-400">
              รีวิวนี้จะถูกบันทึกเป็นข้อมูลจำลองและแสดงบนโปรไฟล์ฟรีแลนซ์
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
