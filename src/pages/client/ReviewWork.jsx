import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/contexts/ToastContext'
import { projectService } from '@/services/api/projectService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Avatar } from '@/components/common/Avatar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { RatingStars } from '@/components/common/RatingStars'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { Textarea } from '@/components/common/FormField'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { escrowStatus, projectStatus } from '@/constants'
import { formatCurrency, formatDate, timeAgo } from '@/utils/format'

export default function ReviewWork() {
  const { projectId } = useParams()
  const { profileId } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { data: project, loading, error, refresh } = useAsync(
    () => projectService.getProject(projectId),
    [projectId],
  )
  useDocumentTitle(project ? `ตรวจรับงาน — ${project.title}` : 'ตรวจรับงาน')

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <PageLoader />
  if (error || !project) return <ErrorState error={error} onRetry={refresh} />

  if (project.clientId !== profileId) {
    return (
      <EmptyState
        title="คุณไม่มีสิทธิ์ตรวจรับโครงการนี้"
        description="โครงการนี้เป็นของบัญชีลูกค้าอื่น"
        action={
          <Button to="/client/projects" variant="primary">
            กลับไปโครงการของฉัน
          </Button>
        }
      />
    )
  }

  const submission = project.submissions?.[0]
  const status = projectStatus[project.status]
  const escrow = escrowStatus[project.escrowStatus]

  if (!submission) {
    return (
      <div>
        <PageHeader
          title="ยังไม่มีงานส่งตรวจรับ"
          backTo={`/client/projects/${project.id}`}
          backLabel="กลับไปโครงการ"
        />
        <EmptyState
          icon={FileText}
          title="ฟรีแลนซ์ยังไม่ได้ส่งงาน"
          description="เมื่อมีการส่งงาน คุณจะเห็นรายละเอียด ไฟล์ และลิงก์สำหรับตรวจรับในหน้านี้"
          action={
            <Button to={`/client/projects/${project.id}`} variant="secondary">
              ไปที่โครงการ
            </Button>
          }
        />
      </div>
    )
  }

  const approve = async () => {
    setBusy(true)
    try {
      await projectService.approveSubmission(project.id)
      toast.success(
        'อนุมัติงานแล้ว (Mock)',
        'สถานะโครงการและประวัติธุรกรรมถูกอัปเดตในข้อมูลจำลอง — ยังไม่มีการโอนเงินบน blockchain',
      )
      setConfirmApprove(false)
      navigate(`/client/projects/${project.id}`)
    } catch (err) {
      toast.error('อนุมัติไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  const requestRevision = async () => {
    if (feedback.trim().length < 10) {
      setFeedbackError('กรุณาอธิบายสิ่งที่ต้องแก้ไขอย่างน้อย 10 ตัวอักษร')
      return
    }
    setBusy(true)
    try {
      await projectService.requestRevision(project.id, feedback.trim())
      toast.success('ส่งคำขอแก้ไขแล้ว', 'ฟรีแลนซ์จะเห็น feedback ในหน้าโครงการ (ข้อมูลจำลอง)')
      setRevisionOpen(false)
      setFeedback('')
      navigate(`/client/projects/${project.id}`)
    } catch (err) {
      toast.error('ส่งคำขอแก้ไขไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Review submission"
        title="ตรวจรับงาน"
        description={project.title}
        backTo={`/client/projects/${project.id}`}
        backLabel="กลับไปรายละเอียดโครงการ"
        actions={
          <>
            <StatusBadge label={status?.label} tone={status?.tone} />
            <StatusBadge label={escrow?.label} tone={escrow?.tone} />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/[0.06] bg-paper-soft/60 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Submission
                </p>
                <h2 className="mt-1 text-base font-bold text-ink">{submission.title}</h2>
                <p className="mt-0.5 text-[11px] text-ink-500">ส่งเมื่อ {timeAgo(submission.submittedAt)}</p>
              </div>
              <StatusBadge
                tone={submission.status === 'approved' ? 'emerald' : submission.status === 'revision' ? 'rose' : 'amber'}
                label={
                  submission.status === 'approved'
                    ? 'อนุมัติแล้ว'
                    : submission.status === 'revision'
                      ? 'ขอแก้ไข'
                      : 'รอตรวจรับ'
                }
              />
            </div>

            <div className="p-5">
              <p className="whitespace-pre-line text-[13px] leading-[1.85] text-ink-600">
                {submission.description}
              </p>

              {submission.link && (
                <a
                  href={submission.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  เปิดลิงก์ผลงาน
                  <span className="max-w-[240px] truncate font-normal text-ink-400">
                    {submission.link}
                  </span>
                </a>
              )}

              {submission.files?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">ไฟล์แนบ</p>
                  <ul className="mt-2 space-y-1.5">
                    {submission.files.map((file) => (
                      <li
                        key={file}
                        className="flex items-center gap-2 rounded-lg border border-ink/[0.07] bg-white px-3 py-2 text-[11.5px] text-ink-600"
                      >
                        <FileText className="h-3.5 w-3.5 text-brand-600" />
                        {file}
                        <span className="ml-auto text-[10px] text-ink-400">mock file</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {submission.feedback && (
                <div className="mt-4 rounded-xl border border-ink/[0.07] bg-paper px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    Feedback ล่าสุด
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-600">{submission.feedback}</p>
                </div>
              )}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">ตรวจสอบก่อนอนุมัติ</h2>
            <ul className="mt-3 space-y-2">
              {[
                'งานตรงกับขอบเขตและ deliverables ที่ตกลงไว้',
                'ไฟล์และลิงก์เปิดได้และเป็นเวอร์ชันล่าสุด',
                'งานผ่านการทดสอบบนอุปกรณ์ที่ต้องการ',
                'ไม่มีรายการที่ยังค้างจากการขอแก้ไขครั้งก่อน',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-600">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">การตัดสินใจ</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                variant="brand"
                size="md"
                icon={CheckCircle2}
                onClick={() => setConfirmApprove(true)}
                className="w-full"
              >
                อนุมัติงาน
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={RotateCcw}
                onClick={() => setRevisionOpen(true)}
                className="w-full"
              >
                ขอแก้ไขงาน
              </Button>
            </div>
            <InfoBanner tone="warning" className="mt-3" title="ยังไม่มีการโอนเงินจริง">
              การอนุมัติจะอัปเดตสถานะโครงการและธุรกรรมใน mock data เท่านั้น
              การปล่อยเงินบน blockchain ต้องรอ ABI / Contract Address และการยืนยันจาก Wallet
            </InfoBanner>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold">สรุปโครงการ</h2>
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar
                name={project.freelancer?.name || 'Freelancer'}
                color={project.freelancer?.avatarColor}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">{project.freelancer?.name}</p>
                <p className="truncate text-[10.5px] text-ink-500">{project.freelancer?.title}</p>
                <RatingStars rating={project.freelancer?.rating || 0} size="xs" showValue />
              </div>
            </div>
            <div className="mt-4 space-y-2.5 border-t border-ink/[0.07] pt-4 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">มูลค่าโครงการ</span>
                <span className="font-bold text-ink">{formatCurrency(project.budget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">เงินใน Escrow</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(project.escrowStatus === 'funded' ? project.escrowAmount : 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">กำหนดส่ง</span>
                <span className="font-semibold text-ink">{formatDate(project.dueDate)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Button to={`/client/projects/${project.id}/escrow`} variant="secondary" size="sm" className="w-full" icon={Wallet}>
                ดูสถานะ Escrow
              </Button>
              <Button to="/messages" variant="ghost" size="sm" className="w-full" icon={MessageSquare}>
                คุยกับฟรีแลนซ์
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Mock review flow
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800/80">
              ข้อมูลงานส่งและ feedback เป็นข้อมูลจำลอง หากต้องการตรวจสอบซ้ำ ให้ refresh หน้า
              ระบบจะโหลดจาก mock database
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-ink/[0.07] bg-white px-3.5 py-3 text-[10.5px] text-ink-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Escrow release ต้องยืนยันจาก Smart Contract
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={approve}
        loading={busy}
        title="อนุมัติงานและปิดโครงการ?"
        description="สถานะโครงการจะเปลี่ยนเป็น “เสร็จสิ้น” และบันทึกธุรกรรมตัวอย่างใน mock data — การโอนเงินจริงยังไม่เกิดขึ้นจนกว่าจะเชื่อมต่อ Smart Contract"
        confirmLabel="อนุมัติงาน (Mock)"
        tone="brand"
      />

      <Modal
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        title="ขอแก้ไขงาน"
        description="อธิบายสิ่งที่ต้องแก้ไขให้ชัดเจน ฟรีแลนซ์จะเห็นข้อความนี้ในหน้าโครงการ"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevisionOpen(false)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button variant="brand" onClick={requestRevision} loading={busy}>
              ส่งคำขอแก้ไข
            </Button>
          </>
        }
      >
        <Textarea
          label="รายละเอียดที่ต้องแก้ไข"
          rows={5}
          value={feedback}
          onChange={(event) => {
            setFeedback(event.target.value)
            setFeedbackError('')
          }}
          error={feedbackError}
          placeholder="เช่น กรุณาปรับ responsive ของตารางในหน้า dashboard ให้ใช้งานบน tablet ได้..."
          required
        />
      </Modal>
    </div>
  )
}
