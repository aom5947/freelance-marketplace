import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Send, ShieldCheck, UploadCloud } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { projectService } from '@/services/api/projectService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/FormField'
import { FileUploadArea } from '@/components/common/FileUploadArea'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { escrowStatus, projectStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'
import { validate, minLength, required } from '@/utils/validators'

export default function SubmitWork() {
  const { projectId } = useParams()
  const { profileId } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const { data: project, loading, error, refresh } = useAsync(
    () => projectService.getProject(projectId),
    [projectId],
  )
  useDocumentTitle(project ? `ส่งงาน — ${project.title}` : 'ส่งงาน')

  const [values, setValues] = useState({ title: '', description: '', link: '' })
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
      title: [required('ชื่อผลงาน'), minLength(5, 'ชื่อผลงาน')],
      description: [required('รายละเอียดผลงาน'), minLength(20, 'รายละเอียดผลงาน')],
    })
    if (values.link && !/^https?:\/\/.+\..+/.test(values.link)) {
      nextErrors.link = 'ลิงก์ต้องเริ่มด้วย http:// หรือ https://'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      await projectService.submitWork(project.id, {
        title: values.title.trim(),
        description: values.description.trim(),
        link: values.link.trim(),
        files: files.map((file) => file.name),
      })
      toast.success(
        'ส่งงานแล้ว (Mock)',
        'สถานะโครงการเปลี่ยนเป็น “รอตรวจรับ” ใน mock data — ไฟล์ยังไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์',
      )
      navigate(`/freelancer/projects/${project.id}`)
    } catch (err) {
      toast.error('ส่งงานไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !project) return <ErrorState error={error} onRetry={refresh} />

  if (project.freelancerId !== profileId) {
    return (
      <div>
        <PageHeader title="คุณไม่มีสิทธิ์ส่งงานในโครงการนี้" />
        <InfoBanner tone="danger" title="ไม่ใช่โครงการของคุณ">
          โครงการนี้เป็นของฟรีแลนซ์คนอื่น — กลับไปที่รายการโครงการของคุณ
        </InfoBanner>
        <Button to="/freelancer/projects" variant="primary" className="mt-4">
          กลับไปโครงการ
        </Button>
      </div>
    )
  }

  const escrow = escrowStatus[project.escrowStatus]
  const status = projectStatus[project.status]
  const funded = project.escrowStatus !== 'unfunded'
  const alreadyInReview = project.status === 'in_review'

  return (
    <div>
      <PageHeader
        eyebrow="Submit work"
        title="ส่งมอบงาน"
        description={project.title}
        backTo={`/freelancer/projects/${project.id}`}
        backLabel="กลับไปรายละเอียดโครงการ"
        actions={
          <>
            <StatusBadge label={status?.label} tone={status?.tone} />
            <StatusBadge label={escrow?.label} tone={escrow?.tone} />
          </>
        }
      />

      {!funded && (
        <InfoBanner tone="warning" className="mb-5" title="ยังไม่สามารถส่งงานได้อย่างสมบูรณ์">
          ลูกค้ายังไม่ได้ฝากเงินเข้า escrow — แนะนำให้รอการฝากเงินก่อนเริ่มหรือส่งงาน
          เพื่อให้มั่นใจว่าจะได้รับการจ่ายเงิน
        </InfoBanner>
      )}

      {alreadyInReview && (
        <InfoBanner tone="info" className="mb-5" title="งานล่าสุดอยู่ระหว่างการตรวจรับ">
          คุณสามารถส่งงานเวอร์ชันใหม่ได้หากลูกค้าขอแก้ไข แต่การส่งซ้ำจะเพิ่มรายการใหม่ในประวัติ
        </InfoBanner>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} noValidate className="space-y-4">
          <section className="card p-5">
            <h2 className="text-sm font-bold">รายละเอียดงานที่ส่ง</h2>
            <div className="mt-4 space-y-3.5">
              <Input
                label="ชื่อผลงาน / เวอร์ชัน"
                value={values.title}
                onChange={(event) => setField('title', event.target.value)}
                error={errors.title}
                placeholder="เช่น Landing page v1 พร้อม design system"
                required
              />
              <Textarea
                label="อธิบายสิ่งที่ส่งมอบ"
                rows={5}
                value={values.description}
                onChange={(event) => setField('description', event.target.value)}
                error={errors.description}
                placeholder="สรุปงานที่ทำ ไฟล์ที่แนบ และจุดที่อยากให้ลูกค้าตรวจเป็นพิเศษ"
                required
              />
              <Input
                label="ลิงก์ผลงาน (ไม่บังคับ)"
                type="url"
                value={values.link}
                onChange={(event) => setField('link', event.target.value)}
                error={errors.link}
                placeholder="https://figma.com/... หรือ https://github.com/..."
                hint="ใช้ลิงก์ที่ลูกค้าเข้าถึงได้ — หลีกเลี่ยงลิงก์ที่ต้องขอสิทธิ์เพิ่ม"
              />
              <FileUploadArea
                files={files}
                onFilesChange={setFiles}
                label="ไฟล์แนบ"
                hint="ไฟล์เก็บในหน่วยความจำของเบราว์เซอร์เท่านั้น ยังไม่มีระบบอัปโหลด"
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">เช็กลิสต์ก่อนส่ง</h2>
            <ul className="mt-3 space-y-2">
              {[
                'ตรวจงานครบทุก deliverables ในขอบเขตที่ตกลง',
                'ไฟล์และลิงก์เปิดได้โดยไม่ต้องขอสิทธิ์',
                'ทดสอบบนอุปกรณ์และเบราว์เซอร์หลักแล้ว',
                'ระบุเวอร์ชันและสิ่งที่เปลี่ยนแปลงให้ชัดเจน',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-600">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <InfoBanner tone="warning" title="Mock submission">
            การส่งงานจะอัปเดตสถานะโครงการใน mock data และสร้าง notification ตัวอย่างให้ลูกค้า
            — ไฟล์ไม่ได้ถูกอัปโหลดจริง
          </InfoBanner>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="brand" size="md" icon={Send} loading={busy}>
              ส่งงานให้ลูกค้า
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold">สรุปโครงการ</h2>
            <div className="mt-3 space-y-2.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">ลูกค้า</span>
                <span className="font-semibold text-ink">{project.client?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">มูลค่างาน</span>
                <span className="font-bold text-ink">{formatCurrency(project.budget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">กำหนดส่ง</span>
                <span className="font-semibold text-ink">{formatDate(project.dueDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">เงินใน Escrow</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(project.escrowStatus === 'funded' ? project.escrowAmount : 0)}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-ink/[0.06] pt-3">
              {(project.milestones || []).map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between gap-2 text-[10.5px]">
                  <span className="truncate text-ink-500">{milestone.title}</span>
                  <span className="shrink-0 font-semibold text-ink">{formatCurrency(milestone.amount, { compact: true })}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 text-[12px] font-bold">
              <UploadCloud className="h-4 w-4 text-brand-600" />
              หลังส่งงาน
            </div>
            <ol className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-ink-500">
              <li>1. ลูกค้าได้รับแจ้งเตือนและตรวจงาน</li>
              <li>2. หากผ่าน จะอนุมัติและปล่อยเงินจาก escrow</li>
              <li>3. หากต้องแก้ไข คุณจะเห็น feedback และส่งใหม่ได้</li>
            </ol>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50/70 px-3 py-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <p className="text-[10px] leading-relaxed text-emerald-800">
                เงินใน escrow จะถูกปล่อยเมื่อลูกค้าอนุมัติ — การโอนจริงต้องรอ Smart Contract
              </p>
            </div>
          </div>

          {values.link && (
            <a
              href={values.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-[11px] text-ink-500 transition hover:border-brand-300"
            >
              <ExternalLink className="h-3.5 w-3.5 text-brand-600" />
              ตัวอย่างลิงก์ที่ลูกค้าจะเห็น
            </a>
          )}
        </aside>
      </div>
    </div>
  )
}
