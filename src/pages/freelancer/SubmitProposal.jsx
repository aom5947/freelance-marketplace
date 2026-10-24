import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobService } from '@/services/api/jobService'
import { proposalService } from '@/services/api/proposalService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/FormField'
import { FileUploadArea } from '@/components/common/FileUploadArea'
import { InfoBanner } from '@/components/common/InfoBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Avatar } from '@/components/common/Avatar'
import { jobStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'
import { validate, minLength, positiveNumber, required } from '@/utils/validators'

export default function SubmitProposal() {
  const { jobId } = useParams()
  const { user, profileId } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const { data: job, loading, error, refresh } = useAsync(() => jobService.getJob(jobId), [jobId])
  useDocumentTitle(job ? `ส่งข้อเสนอ — ${job.title}` : 'ส่งข้อเสนอ')

  const { data: myProposals } = useAsync(
    () => proposalService.listByFreelancer(profileId),
    [profileId],
  )
  const existing = (myProposals || []).find(
    (proposal) => proposal.jobId === jobId && proposal.status !== 'withdrawn',
  )

  const [values, setValues] = useState({ bidAmount: '', deliveryDays: '', coverLetter: '' })
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values, {
      bidAmount: [required('ราคาเสนอ'), positiveNumber('ราคาเสนอ')],
      deliveryDays: [required('ระยะเวลาส่งงาน'), positiveNumber('ระยะเวลาส่งงาน')],
      coverLetter: [required('ข้อความแนะนำตัว'), minLength(80, 'ข้อความแนะนำตัว')],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      await proposalService.createProposal({
        jobId,
        freelancerId: profileId,
        bidAmount: Number(values.bidAmount),
        deliveryDays: Number(values.deliveryDays),
        coverLetter: values.coverLetter.trim(),
        attachments: files.map((file) => file.name),
      })
      toast.success(
        'ส่งข้อเสนอแล้ว (Mock)',
        'ข้อเสนอถูกบันทึกใน mock database — ยังไม่ถูกส่งถึงลูกค้าจริง',
      )
      navigate('/freelancer/proposals')
    } catch (err) {
      toast.error('ส่งข้อเสนอไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !job) return <ErrorState error={error} onRetry={refresh} />

  const status = jobStatus[job.status]
  const closed = job.status !== 'open'

  if (existing) {
    return (
      <div>
        <PageHeader
          eyebrow="Proposal"
          title="คุณส่งข้อเสนอสำหรับงานนี้แล้ว"
          description={job.title}
          backTo={`/freelancer/jobs/${job.id}`}
          backLabel="กลับไปรายละเอียดงาน"
        />
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] text-ink-500">ราคาที่เสนอ</p>
              <p className="text-2xl font-extrabold text-ink">{formatCurrency(existing.bidAmount)}</p>
              <p className="mt-1 text-[11.5px] text-ink-500">ระยะเวลา {existing.deliveryDays} วัน</p>
            </div>
            <StatusBadge
              label={
                existing.status === 'pending'
                  ? 'รอพิจารณา'
                  : existing.status === 'shortlisted'
                    ? 'ผ่านการคัดเลือก'
                    : existing.status === 'hired'
                      ? 'ได้รับงาน'
                      : 'ไม่ผ่าน'
              }
              tone={
                existing.status === 'hired'
                  ? 'emerald'
                  : existing.status === 'shortlisted'
                    ? 'blue'
                    : existing.status === 'rejected'
                      ? 'rose'
                      : 'amber'
              }
            />
          </div>
          <p className="mt-4 whitespace-pre-line rounded-xl bg-paper p-4 text-[12px] leading-relaxed text-ink-600">
            {existing.coverLetter}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/freelancer/proposals" variant="brand" size="md">
              ดูข้อเสนอของฉัน
            </Button>
            <Button to={`/freelancer/jobs/${job.id}`} variant="secondary" size="md">
              กลับไปที่งาน
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Submit proposal"
        title="ส่งข้อเสนอสำหรับงานนี้"
        description={job.title}
        backTo={`/freelancer/jobs/${job.id}`}
        backLabel="กลับไปรายละเอียดงาน"
        actions={status && <StatusBadge label={status.label} tone={status.tone} pulse={job.status === 'open'} />}
      />

      {closed && (
        <InfoBanner tone="warning" className="mb-5" title="ประกาศนี้ปิดรับข้อเสนอแล้ว">
          คุณยังดูรายละเอียดได้ แต่ไม่สามารถส่งข้อเสนอใหม่ได้
        </InfoBanner>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} noValidate className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">ข้อเสนอของคุณ</h2>
              <span className="text-[10px] text-ink-400">* จำเป็น</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="ราคาที่เสนอ (บาท)"
                type="number"
                min="1"
                placeholder={String(job.budgetMin)}
                value={values.bidAmount}
                onChange={(event) => setField('bidAmount', event.target.value)}
                error={errors.bidAmount}
                hint={`งบลูกค้า ${formatCurrency(job.budgetMin, { compact: true })}–${formatCurrency(job.budgetMax, { compact: true })}`}
                required
              />
              <Input
                label="ระยะเวลาส่งงาน (วัน)"
                type="number"
                min="1"
                placeholder="21"
                value={values.deliveryDays}
                onChange={(event) => setField('deliveryDays', event.target.value)}
                error={errors.deliveryDays}
                required
              />
            </div>
            <div className="mt-3">
              <Textarea
                label="ข้อความแนะนำตัว"
                rows={9}
                value={values.coverLetter}
                onChange={(event) => setField('coverLetter', event.target.value)}
                error={errors.coverLetter}
                hint={`${values.coverLetter.length} ตัวอักษร — อย่างน้อย 80 ตัวอักษร`}
                placeholder={
                  'อธิบายความเข้าใจในโจทย์ แนวทางทำงาน ระยะเวลา และสิ่งที่คุณจะส่งมอบ\n\nแนะนำผลงานที่เกี่ยวข้องและเหตุผลว่าทำไมคุณเหมาะกับงานนี้'
                }
                required
              />
            </div>
            <div className="mt-4">
              <FileUploadArea
                files={files}
                onFilesChange={setFiles}
                label="แนบไฟล์ประกอบ (ไม่บังคับ)"
                hint="เก็บไว้ในเบราว์เซอร์เท่านั้น — ยังไม่มีระบบอัปโหลด"
              />
            </div>
          </section>

          <InfoBanner tone="warning" title="ข้อเสนอเป็นข้อมูลจำลอง">
            การส่งข้อเสนอจะบันทึกใน mock database ของเบราว์เซอร์
            ไม่มีการแจ้งเตือนหรือส่งข้อมูลถึงลูกค้าจริง — การเชื่อม Backend จะทำให้ flow นี้สมบูรณ์
          </InfoBanner>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="brand" size="md" icon={Send} loading={busy} disabled={closed}>
              ส่งข้อเสนอ
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">งานที่ส่งข้อเสนอ</p>
            <h2 className="mt-1.5 text-sm font-bold leading-snug text-ink">{job.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1">
              {(job.skills || []).map((skill) => (
                <span key={skill} className="rounded-md bg-paper px-2 py-0.5 text-[10px] text-ink-500">
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-ink/[0.06] pt-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">งบประมาณ</span>
                <span className="font-bold text-ink">
                  {formatCurrency(job.budgetMin, { compact: true })}–{formatCurrency(job.budgetMax, { compact: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">กำหนดส่ง</span>
                <span className="font-semibold text-ink">{formatDate(job.deadline)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">ข้อเสนอทั้งหมด</span>
                <span className="font-semibold text-ink">{job.proposalsCount} ราย</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-paper p-3">
              <Avatar name={job.client?.name || 'Client'} color={job.client?.avatarColor} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-ink">{job.client?.name}</p>
                <p className="truncate text-[10px] text-ink-400">{job.client?.title}</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold">เขียนข้อเสนอให้ได้งาน</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                'อ้างอิงโจทย์และแสดงว่าคุณเข้าใจปัญหาจริง',
                'อธิบายแนวทางทำงานเป็นขั้นตอน ไม่ใช่แค่ราคา',
                'แนบตัวอย่างงานที่ใกล้เคียงกับงานนี้',
                'ระบุสิ่งที่จะส่งมอบและสมมติฐานให้ชัด',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-600">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              อย่าแชร์ข้อมูลส่วนตัว
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-amber-800/80">
              อย่าส่งเลขบัญชี รหัสผ่าน หรือข้อมูลอ่อนไหวในข้อเสนอ — การชำระเงินจะทำผ่าน escrow เท่านั้น
            </p>
          </div>

          <p className="flex items-center gap-1.5 px-1 text-[10px] text-ink-400">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            สัญญาและ escrow จะเริ่มหลังลูกค้าเลือกคุณ
          </p>
        </aside>
      </div>
    </div>
  )
}
