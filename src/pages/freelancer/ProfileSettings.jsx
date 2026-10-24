import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, Plus, Save, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { profileService } from '@/services/api/profileService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Input, Select, Textarea } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { ProgressBar } from '@/components/common/ProgressBar'
import { InfoBanner } from '@/components/common/InfoBanner'
import { FreelancerCard } from '@/components/profile/FreelancerCard'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { availabilityOptions } from '@/constants'
import { formatCurrency } from '@/utils/format'
import { validate, minLength, positiveNumber, required } from '@/utils/validators'
import { cn } from '@/utils/cn'

const avatarColors = [
  'from-violet-500 to-indigo-600',
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-orange-500',
  'from-purple-500 to-fuchsia-600',
]

const portfolioAccents = [
  'from-indigo-500 via-violet-500 to-fuchsia-500',
  'from-sky-500 via-blue-500 to-indigo-500',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-emerald-400 via-teal-500 to-cyan-500',
]

const emptyPortfolio = { title: '', category: '', description: '', accent: portfolioAccents[0] }

export default function ProfileSettings() {
  useDocumentTitle('ตั้งค่าโปรไฟล์ฟรีแลนซ์')
  const { profileId, updateUser } = useAuth()
  const toast = useToast()
  const { data: profile, loading, error, refresh } = useAsync(
    () => profileService.getFreelancer(profileId),
    [profileId],
  )

  const [values, setValues] = useState({
    name: '',
    title: '',
    location: '',
    hourlyRate: '',
    bio: '',
    availability: 'open',
    avatarColor: avatarColors[0],
  })
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [languages, setLanguages] = useState('')
  const [portfolio, setPortfolio] = useState([])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [portfolioDraft, setPortfolioDraft] = useState(emptyPortfolio)
  const [portfolioErrors, setPortfolioErrors] = useState({})
  const hydrated = useRef(false)

  useEffect(() => {
    if (!profile || hydrated.current) return
    hydrated.current = true
    setValues({
      name: profile.name || '',
      title: profile.title || '',
      location: profile.location || '',
      hourlyRate: String(profile.hourlyRate || ''),
      bio: profile.bio || '',
      availability: profile.availability || 'open',
      avatarColor: profile.avatarColor || avatarColors[0],
    })
    setSkills(profile.skills || [])
    setLanguages((profile.languages || []).join(', '))
    setPortfolio(profile.portfolio || [])
  }, [profile])

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
    }
    setSkillInput('')
  }

  const addPortfolioItem = () => {
    const nextErrors = validate(portfolioDraft, {
      title: [required('ชื่อผลงาน'), minLength(3, 'ชื่อผลงาน')],
      category: [required('หมวดหมู่ผลงาน')],
      description: [required('คำอธิบาย'), minLength(10, 'คำอธิบาย')],
    })
    setPortfolioErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setPortfolio((current) => [
      {
        ...portfolioDraft,
        id: `w-${Date.now()}`,
        title: portfolioDraft.title.trim(),
        category: portfolioDraft.category.trim(),
        description: portfolioDraft.description.trim(),
      },
      ...current,
    ])
    setPortfolioDraft(emptyPortfolio)
    setPortfolioErrors({})
    setPortfolioOpen(false)
    toast.info('เพิ่มผลงานในแบบฟอร์มแล้ว', 'กด “บันทึกโปรไฟล์” เพื่อยืนยันการเปลี่ยนแปลง')
  }

  const save = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values, {
      name: [required('ชื่อ'), minLength(2, 'ชื่อ')],
      title: [required('ตำแหน่ง'), minLength(3, 'ตำแหน่ง')],
      hourlyRate: [required('อัตราค่าจ้าง'), positiveNumber('อัตราค่าจ้าง')],
      bio: [required('เกี่ยวกับคุณ'), minLength(40, 'เกี่ยวกับคุณ')],
    })
    if (skills.length === 0) nextErrors.skills = 'เพิ่มทักษะอย่างน้อย 1 รายการ'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.warning('ข้อมูลยังไม่ครบ', 'กรุณาตรวจสอบช่องที่แจ้งเตือน')
      return
    }

    setBusy(true)
    try {
      await profileService.updateFreelancer(profileId, {
        ...values,
        hourlyRate: Number(values.hourlyRate),
        skills,
        languages: languages
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        portfolio,
      })
      updateUser({ name: values.name, title: values.title, avatarColor: values.avatarColor })
      toast.success('บันทึกโปรไฟล์แล้ว', 'ข้อมูลถูกอัปเดตใน mock database — ยังไม่ผูกกับ Backend')
      refresh()
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !profile) return <ErrorState error={error} onRetry={refresh} />

  const completionItems = [
    { label: 'ชื่อและตำแหน่ง', done: values.name && values.title },
    { label: 'คำอธิบายอย่างน้อย 40 ตัวอักษร', done: values.bio.trim().length >= 40 },
    { label: 'ทักษะอย่างน้อย 3 รายการ', done: skills.length >= 3 },
    { label: 'ผลงานอย่างน้อย 2 ชิ้น', done: portfolio.length >= 2 },
    { label: 'อัตราค่าจ้าง', done: Boolean(values.hourlyRate) },
  ]
  const completion = Math.round(
    (completionItems.filter((item) => item.done).length / completionItems.length) * 100,
  )

  return (
    <div>
      <PageHeader
        eyebrow="Freelancer profile"
        title="โปรไฟล์ฟรีแลนซ์"
        description="โปรไฟล์ที่ครบถ้วนช่วยให้ลูกค้าเข้าใจความสามารถและตัดสินใจจ้างคุณได้เร็วขึ้น"
        actions={
          <>
            <Button to={`/freelancers/${profileId}`} variant="secondary" size="md" icon={ExternalLink}>
              ดูโปรไฟล์สาธารณะ
            </Button>
            <Button variant="brand" size="md" icon={Save} onClick={save} loading={busy}>
              บันทึกโปรไฟล์
            </Button>
          </>
        }
      />

      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-sm font-bold">ข้อมูลพื้นฐาน</h2>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Input
                label="ชื่อที่แสดง"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                error={errors.name}
                required
              />
              <Input
                label="ตำแหน่ง / ความเชี่ยวชาญ"
                value={values.title}
                onChange={(event) => setField('title', event.target.value)}
                error={errors.title}
                placeholder="เช่น Senior Product Designer"
                required
              />
              <Input
                label="ที่ตั้ง"
                value={values.location}
                onChange={(event) => setField('location', event.target.value)}
                placeholder="เชียงใหม่"
              />
              <Input
                label="อัตราค่าจ้างต่อชั่วโมง (บาท)"
                type="number"
                min="0"
                value={values.hourlyRate}
                onChange={(event) => setField('hourlyRate', event.target.value)}
                error={errors.hourlyRate}
                hint={values.hourlyRate ? formatCurrency(Number(values.hourlyRate)) : undefined}
                required
              />
              <Select
                label="สถานะการรับงาน"
                value={values.availability}
                onChange={(event) => setField('availability', event.target.value)}
              >
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Input
                label="ภาษา (คั่นด้วย comma)"
                value={languages}
                onChange={(event) => setLanguages(event.target.value)}
                placeholder="ไทย, English"
              />
            </div>
            <div className="mt-3.5">
              <Textarea
                label="เกี่ยวกับคุณ"
                rows={5}
                value={values.bio}
                onChange={(event) => setField('bio', event.target.value)}
                error={errors.bio}
                hint="อธิบายประสบการณ์ แนวทางการทำงาน และสิ่งที่ลูกค้าจะได้รับ"
                required
              />
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">ทักษะ</h2>
              <span className="text-[10px] text-ink-400">{skills.length} รายการ</span>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={skillInput}
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault()
                    addSkill()
                  }
                }}
                placeholder="พิมพ์ทักษะแล้วกด Enter เช่น Design System"
                className={cn('field-control', errors.skills && 'field-error')}
                aria-label="เพิ่มทักษะ"
              />
              <Button type="button" variant="secondary" size="md" icon={Plus} onClick={addSkill}>
                เพิ่ม
              </Button>
            </div>
            {errors.skills && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.skills}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
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
              {skills.length === 0 && (
                <p className="text-[11px] text-ink-400">ยังไม่มีทักษะ — เพิ่มอย่างน้อย 3 รายการเพื่อโปรไฟล์ที่สมบูรณ์</p>
              )}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">ผลงาน</h2>
                <p className="mt-0.5 text-[11px] text-ink-500">แสดงบนโปรไฟล์สาธารณะ</p>
              </div>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                icon={Plus}
                onClick={() => setPortfolioOpen(true)}
              >
                เพิ่มผลงาน
              </Button>
            </div>

            {portfolio.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink/10 bg-paper-soft px-4 py-6 text-center text-[11.5px] text-ink-500">
                ยังไม่มีผลงาน — เพิ่มผลงานอย่างน้อย 2 ชิ้นเพื่อเพิ่มโอกาสได้งาน
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {portfolio.map((work) => (
                  <li
                    key={work.id}
                    className="flex items-center gap-3 rounded-xl border border-ink/[0.07] p-2.5"
                  >
                    <span className={`flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${work.accent}`}>
                      <span className="text-[9px] font-bold uppercase text-white/80">work</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{work.title}</p>
                      <p className="truncate text-[10.5px] text-ink-500">{work.category}</p>
                      <p className="line-clamp-1 text-[10px] text-ink-400">{work.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPortfolio((current) => current.filter((item) => item.id !== work.id))
                        toast.info('นำผลงานออกจากแบบฟอร์มแล้ว', 'กดบันทึกเพื่อยืนยัน')
                      }}
                      className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`ลบผลงาน ${work.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={refresh} disabled={busy}>
              ยกเลิกการแก้ไข
            </Button>
            <Button type="submit" variant="brand" icon={Save} loading={busy}>
              บันทึกโปรไฟล์
            </Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              ตัวอย่างการ์ดโปรไฟล์
            </p>
            <FreelancerCard
              freelancer={{
                ...profile,
                ...values,
                hourlyRate: Number(values.hourlyRate) || profile.hourlyRate,
                rating: profile.rating,
                reviewsCount: profile.reviewsCount,
              }}
              to={`/freelancers/${profileId}`}
              actions={
                <Link
                  to={`/freelancers/${profileId}`}
                  className="text-[11px] font-semibold text-brand-700 hover:underline"
                >
                  เปิดโปรไฟล์ →
                </Link>
              }
            />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">ความสมบูรณ์ของโปรไฟล์</h2>
              <span className="text-sm font-extrabold text-brand-700">{completion}%</span>
            </div>
            <ProgressBar value={completion} className="mt-2" />
            <ul className="mt-3 space-y-2">
              {completionItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 items-center justify-center rounded-full',
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

          <div className="card p-5">
            <h2 className="text-sm font-bold">สีโปรไฟล์</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setField('avatarColor', color)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white transition',
                    color,
                    values.avatarColor === color ? 'ring-2 ring-ink ring-offset-2' : 'opacity-80 hover:opacity-100',
                  )}
                  aria-label={`เลือกสี ${color}`}
                  aria-pressed={values.avatarColor === color}
                >
                  {values.avatarColor === color && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          <InfoBanner tone="warning" title="ข้อมูลจำลอง">
            การเปลี่ยนแปลงโปรไฟล์มีผลเฉพาะ mock database ในเบราว์เซอร์
            และจะหายไปเมื่อรีเซ็ตข้อมูลตัวอย่าง
          </InfoBanner>
        </aside>
      </form>

      <Modal
        open={portfolioOpen}
        onClose={() => setPortfolioOpen(false)}
        title="เพิ่มผลงาน"
        description="เพิ่มตัวอย่างงานที่เกี่ยวข้องเพื่อให้ลูกค้าเห็นความสามารถของคุณ"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPortfolioOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="brand" onClick={addPortfolioItem}>
              เพิ่มผลงาน
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="ชื่อผลงาน"
            value={portfolioDraft.title}
            onChange={(event) => setPortfolioDraft({ ...portfolioDraft, title: event.target.value })}
            error={portfolioErrors.title}
            placeholder="เช่น Merchant Analytics Dashboard"
            required
          />
          <Input
            label="หมวดหมู่"
            value={portfolioDraft.category}
            onChange={(event) => setPortfolioDraft({ ...portfolioDraft, category: event.target.value })}
            error={portfolioErrors.category}
            placeholder="เช่น SaaS · Product Design"
            required
          />
          <Textarea
            label="คำอธิบาย"
            rows={3}
            value={portfolioDraft.description}
            onChange={(event) => setPortfolioDraft({ ...portfolioDraft, description: event.target.value })}
            error={portfolioErrors.description}
            placeholder="อธิบายโจทย์ แนวทาง และผลลัพธ์ของงานชิ้นนี้"
            required
          />
          <div>
            <p className="field-label">สีพื้นหลังผลงาน</p>
            <div className="flex gap-2">
              {portfolioAccents.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  onClick={() => setPortfolioDraft({ ...portfolioDraft, accent })}
                  className={cn(
                    'h-8 w-12 rounded-lg bg-gradient-to-br transition',
                    accent,
                    portfolioDraft.accent === accent ? 'ring-2 ring-ink ring-offset-2' : 'opacity-80',
                  )}
                  aria-label="เลือกสีพื้นหลังผลงาน"
                  aria-pressed={portfolioDraft.accent === accent}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
