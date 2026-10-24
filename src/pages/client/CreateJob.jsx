import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { CalendarDays, Check, FileText, Lightbulb, Plus, Save, Send, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobService } from '@/services/api/jobService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Input, Select, Textarea } from '@/components/common/FormField'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { categories, categoryMap, experienceLevels } from '@/constants'
import { formatCurrency } from '@/utils/format'
import { validate, minLength, required } from '@/utils/validators'
import { cn } from '@/utils/cn'

const emptyValues = {
  title: '',
  category: '',
  description: '',
  budgetType: 'fixed',
  budgetMin: '',
  budgetMax: '',
  duration: '',
  experience: 'intermediate',
  deadline: '',
}

export default function CreateJob() {
  const { jobId } = useParams()
  const isEdit = Boolean(jobId)
  useDocumentTitle(isEdit ? 'แก้ไขประกาศงาน' : 'สร้างประกาศงาน')
  const { profileId } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const { data: existing, loading, error: loadError } = useAsync(
    () => (isEdit ? jobService.getJob(jobId) : Promise.resolve(null)),
    [jobId],
  )

  const [values, setValues] = useState(emptyValues)
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(null)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!existing || hydrated.current) return
    hydrated.current = true
    setValues({
      title: existing.title || '',
      category: existing.category || '',
      description: existing.description || '',
      budgetType: existing.budgetType || 'fixed',
      budgetMin: String(existing.budgetMin || ''),
      budgetMax: String(existing.budgetMax || ''),
      duration: existing.duration || '',
      experience: existing.experience || 'intermediate',
      deadline: existing.deadline ? existing.deadline.slice(0, 10) : '',
    })
    setSkills(existing.skills || [])
    setDeliverables((existing.deliverables || []).join('\n'))
  }, [existing])

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const addSkill = () => {
    const value = skillInput.trim().replace(/,$/, '')
    if (!value) return
    if (!skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkills((current) => [...current, value])
      setErrors((current) => {
        const next = { ...current }
        delete next.skills
        return next
      })
    }
    setSkillInput('')
  }

  const runValidation = () => {
    const base = validate(values, {
      title: [required('ชื่อประกาศ'), minLength(10, 'ชื่อประกาศ')],
      category: [required('หมวดหมู่')],
      description: [required('รายละเอียดงาน'), minLength(40, 'รายละเอียดงาน')],
      budgetMin: [required('งบประมาณขั้นต่ำ')],
      budgetMax: [
        required('งบประมาณสูงสุด'),
        (value) =>
          Number(value) < Number(values.budgetMin)
            ? 'งบประมาณสูงสุดต้องไม่น้อยกว่าขั้นต่ำ'
            : null,
      ],
      duration: [required('ระยะเวลางาน')],
    })
    if (skills.length === 0) base.skills = 'เพิ่มทักษะอย่างน้อย 1 รายการ'
    setErrors(base)
    return Object.keys(base).length === 0
  }

  const submit = async (status) => {
    if (!runValidation()) {
      toast.warning('กรอกข้อมูลยังไม่ครบ', 'กรุณาตรวจสอบช่องที่แจ้งเตือนก่อนบันทึก')
      return
    }
    setBusy(status)
    const payload = {
      title: values.title.trim(),
      category: values.category,
      description: values.description.trim(),
      skills,
      budgetType: values.budgetType,
      budgetMin: Number(values.budgetMin),
      budgetMax: Number(values.budgetMax),
      duration: values.duration.trim(),
      experience: values.experience,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      deliverables: deliverables
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      status,
    }

    try {
      if (isEdit) {
        await jobService.updateJob(jobId, payload)
        toast.success('บันทึกการแก้ไขแล้ว', 'ข้อมูลถูกอัปเดตใน mock data ภายในเบราว์เซอร์')
      } else {
        await jobService.createJob(payload, profileId)
        toast.success(
          status === 'draft' ? 'บันทึกฉบับร่างแล้ว' : 'เผยแพร่ประกาศงานแล้ว',
          'ประกาศนี้เป็นข้อมูลจำลอง — ยังไม่ถูกส่งไปยัง Backend',
        )
      }
      navigate('/client/jobs')
    } catch (error) {
      toast.error('บันทึกไม่สำเร็จ', error.message)
    } finally {
      setBusy(null)
    }
  }

  const previewCategory = useMemo(
    () => categoryMap[values.category],
    [values.category],
  )

  if (isEdit && loading) return <PageLoader />

  if (isEdit && (loadError || !existing)) {
    return (
      <EmptyState
        title="ไม่พบประกาศงานนี้"
        description={
          loadError?.message || 'ประกาศอาจถูกลบไปแล้ว — กลับไปเลือกประกาศอื่นจากรายการของคุณ'
        }
        action={
          <Button to="/client/jobs" variant="primary">
            กลับไปประกาศของฉัน
          </Button>
        }
      />
    )
  }

  if (isEdit && existing && existing.clientId !== profileId) {
    return (
      <EmptyState
        title="คุณไม่มีสิทธิ์แก้ไขประกาศนี้"
        description="ประกาศนี้เป็นของบัญชีลูกค้าอื่น — กลับไปที่รายการประกาศของคุณ"
        action={
          <Button to="/client/jobs" variant="primary">
            กลับไปประกาศของฉัน
          </Button>
        }
      />
    )
  }

  const checklist = [
    { label: 'ชื่อและหมวดหมู่งานชัดเจน', done: values.title.trim().length >= 10 && values.category },
    { label: 'อธิบายขอบเขตงานครบถ้วน', done: values.description.trim().length >= 40 },
    { label: 'ระบุงบประมาณและระยะเวลา', done: values.budgetMin && values.budgetMax && values.duration },
    { label: 'มีทักษะที่ต้องการอย่างน้อย 1 อย่าง', done: skills.length > 0 },
  ]

  return (
    <div>
      <PageHeader
        eyebrow={isEdit ? 'Edit job' : 'Create job'}
        title={isEdit ? 'แก้ไขประกาศงาน' : 'สร้างประกาศงานใหม่'}
        description="ยิ่งระบุขอบเขตและงบประมาณชัดเจน ข้อเสนอที่ได้จะยิ่งตรงกับความต้องการ"
        backTo="/client/jobs"
        backLabel="กลับไปประกาศงานของฉัน"
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-sm font-bold">ข้อมูลพื้นฐาน</h2>
            <div className="mt-4 space-y-4">
              <Input
                label="ชื่อประกาศงาน"
                placeholder="เช่น ออกแบบ Landing Page สำหรับ SaaS"
                value={values.title}
                onChange={(event) => setField('title', event.target.value)}
                error={errors.title}
                hint={`${values.title.length}/80 ตัวอักษร`}
                maxLength={80}
                required
              />
              <Select
                label="หมวดหมู่"
                value={values.category}
                onChange={(event) => setField('category', event.target.value)}
                error={errors.category}
                required
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </Select>
              <Textarea
                label="รายละเอียดงาน"
                rows={8}
                placeholder="อธิบายโจทย์ ขอบเขตงาน สิ่งที่ลูกค้าคาดหวัง และข้อมูลที่มีให้..."
                value={values.description}
                onChange={(event) => setField('description', event.target.value)}
                error={errors.description}
                hint="อย่างน้อย 40 ตัวอักษร — ยิ่งละเอียดยิ่งได้ข้อเสนอที่ตรง"
                required
              />
              <div>
                <p className="field-label">
                  ทักษะที่ต้องการ <span className="text-rose-500">*</span>
                </p>
                <div className="flex gap-2">
                  <input
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="พิมพ์ทักษะแล้วกด Enter"
                    className={cn('field-control', errors.skills && 'field-error')}
                    aria-label="เพิ่มทักษะ"
                  />
                  <Button type="button" variant="secondary" size="md" onClick={addSkill} icon={Plus}>
                    เพิ่ม
                  </Button>
                </div>
                {errors.skills && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.skills}</p>}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <AnimatePresence initial={false}>
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => setSkills((current) => current.filter((item) => item !== skill))}
                          className="rounded p-0.5 transition hover:bg-brand-100"
                          aria-label={`ลบทักษะ ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">ขอบเขตงาน & การส่งมอบ</h2>
            <div className="mt-4 space-y-4">
              <Textarea
                label="สิ่งที่ต้องส่งมอบ"
                rows={5}
                placeholder={'หนึ่งบรรทัดต่อหนึ่งรายการ\nเช่น Figma file พร้อม design system\nLanding page 6 sections'}
                value={deliverables}
                onChange={(event) => setDeliverables(event.target.value)}
                hint="แต่ละบรรทัดจะแสดงเป็นรายการส่งมอบในหน้ารายละเอียดงาน"
              />
              <Select
                label="ระดับประสบการณ์ที่ต้องการ"
                value={values.experience}
                onChange={(event) => setField('experience', event.target.value)}
              >
                {experienceLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </Select>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">งบประมาณ & ไทม์ไลน์</h2>

            <div className="mt-4">
              <p className="field-label">ประเภทงบประมาณ</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'fixed', label: 'ราคาเหมารวม', hint: 'เหมาะกับงานที่มีขอบเขตชัดเจน' },
                  { value: 'hourly', label: 'คิดรายชั่วโมง', hint: 'เหมาะกับงานที่ขอบเขตยังไม่นิ่ง' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setField('budgetType', option.value)}
                    className={cn(
                      'rounded-xl border px-3.5 py-3 text-left transition',
                      values.budgetType === option.value
                        ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/10'
                        : 'border-ink/10 bg-white hover:border-brand-200',
                    )}
                    aria-pressed={values.budgetType === option.value}
                  >
                    <span className="block text-xs font-bold text-ink">{option.label}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-400">{option.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="งบประมาณขั้นต่ำ (บาท)"
                type="number"
                min="0"
                placeholder="45000"
                value={values.budgetMin}
                onChange={(event) => setField('budgetMin', event.target.value)}
                error={errors.budgetMin}
                required
              />
              <Input
                label="งบประมาณสูงสุด (บาท)"
                type="number"
                min="0"
                placeholder="60000"
                value={values.budgetMax}
                onChange={(event) => setField('budgetMax', event.target.value)}
                error={errors.budgetMax}
                required
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="ระยะเวลางาน"
                placeholder="เช่น 2-3 สัปดาห์"
                value={values.duration}
                onChange={(event) => setField('duration', event.target.value)}
                error={errors.duration}
                required
              />
              <Input
                label="กำหนดส่ง"
                type="date"
                value={values.deadline}
                onChange={(event) => setField('deadline', event.target.value)}
                prefix={null}
              />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              ตัวอย่างประกาศ
            </p>
            <h3 className="mt-2 line-clamp-2 text-sm font-bold text-ink">
              {values.title || 'ชื่อประกาศงานของคุณ'}
            </h3>
            <p className="mt-1 text-[11px] text-ink-400">
              {previewCategory?.label || 'หมวดหมู่'} · {values.budgetType === 'hourly' ? 'รายชั่วโมง' : 'เหมารวม'}
            </p>
            <p className="mt-3 line-clamp-3 text-[11.5px] leading-relaxed text-ink-500">
              {values.description || 'รายละเอียดงานจะแสดงที่นี่…'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {skills.slice(0, 4).map((skill) => (
                <span key={skill} className="rounded-md bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-500">
                  {skill}
                </span>
              ))}
              {skills.length > 4 && <span className="text-[10px] text-ink-400">+{skills.length - 4}</span>}
            </div>
            <div className="mt-4 border-t border-ink/[0.06] pt-3">
              <p className="text-[10px] text-ink-400">งบประมาณ</p>
              <p className="text-sm font-bold text-ink">
                {values.budgetMin || '—'} – {values.budgetMax || '—'} บาท
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-ink-500">
                <CalendarDays className="h-3 w-3" />
                {values.duration || 'ยังไม่ระบุระยะเวลา'}
              </p>
            </div>
          </div>

          <div className="card mt-4 p-5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              ก่อนเผยแพร่
            </h3>
            <ul className="mt-3 space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span
                    className={cn(
                      'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                      item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-ink/[0.06] text-ink-300',
                    )}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className={item.done ? 'text-ink-600' : 'text-ink-400'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              variant="brand"
              size="md"
              className="w-full"
              icon={Send}
              loading={busy === 'open'}
              onClick={() => submit('open')}
              disabled={Boolean(busy)}
            >
              {isEdit ? 'บันทึกและเผยแพร่' : 'เผยแพร่ประกาศ'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              icon={Save}
              loading={busy === 'draft'}
              onClick={() => submit('draft')}
              disabled={Boolean(busy)}
            >
              บันทึกเป็นฉบับร่าง
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={() => navigate('/client/jobs')}
              disabled={Boolean(busy)}
            >
              ยกเลิก
            </Button>
          </div>

          <InfoBanner tone="warning" className="mt-4" title="ข้อมูลจำลอง">
            การเผยแพร่จะบันทึกใน mock database ของเบราว์เซอร์เท่านั้น
            ยังไม่มีการเรียก API หรือแจ้งเตือนฟรีแลนซ์จริง
          </InfoBanner>
        </aside>
      </div>

      {values.budgetMin && values.budgetMax && Number(values.budgetMax) >= Number(values.budgetMin) && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] text-ink-500 shadow-sm">
          <FileText className="h-3.5 w-3.5 text-brand-600" />
          ช่วงงบประมาณที่แสดงต่อฟรีแลนซ์: {formatCurrency(Number(values.budgetMin))} –{' '}
          {formatCurrency(Number(values.budgetMax))}
        </p>
      )}
    </div>
  )
}
