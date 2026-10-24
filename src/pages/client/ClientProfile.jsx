import { useEffect, useRef, useState } from 'react'
import { Building2, Check, Save, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { profileService } from '@/services/api/profileService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Input, Textarea } from '@/components/common/FormField'
import { InfoBanner } from '@/components/common/InfoBanner'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { validate, emailFormat, minLength, required } from '@/utils/validators'
import { cn } from '@/utils/cn'

const avatarColors = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-500',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-slate-600 to-slate-900',
]

const emptyForm = {
  name: '',
  contactName: '',
  title: '',
  industry: '',
  location: '',
  website: '',
  bio: '',
  avatarColor: avatarColors[0],
}

export default function ClientProfile() {
  useDocumentTitle('โปรไฟล์ลูกค้า')
  const { profileId, updateUser } = useAuth()
  const toast = useToast()
  const { data: client, loading, error, refresh } = useAsync(
    () => profileService.getClient(profileId),
    [profileId],
  )

  const [values, setValues] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!client || hydrated.current) return
    hydrated.current = true
    setValues({
      name: client.name || '',
      contactName: client.contactName || '',
      title: client.title || '',
      industry: client.industry || '',
      location: client.location || '',
      website: client.website || '',
      bio: client.bio || '',
      avatarColor: client.avatarColor || avatarColors[0],
    })
  }, [client])

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const save = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values, {
      name: [required('ชื่อบริษัท'), minLength(2, 'ชื่อบริษัท')],
      contactName: [required('ชื่อผู้ติดต่อ')],
      title: [required('ตำแหน่ง/คำอธิบาย')],
      bio: [minLength(20, 'เกี่ยวกับคุณ')],
    })
    if (values.website && !/^https?:\/\/.+\..+/.test(values.website)) {
      nextErrors.website = 'รูปแบบ URL ต้องเริ่มด้วย http:// หรือ https://'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      await profileService.updateClient(profileId, values)
      updateUser({ displayName: values.name })
      toast.success('บันทึกโปรไฟล์แล้ว', 'ข้อมูลถูกอัปเดตใน mock database ของเบราว์เซอร์')
      refresh()
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader />
  if (error || !client) return <ErrorState error={error} onRetry={refresh} />

  return (
    <div>
      <PageHeader
        eyebrow="Company profile"
        title="โปรไฟล์ลูกค้า"
        description="ข้อมูลนี้จะแสดงต่อฟรีแลนซ์ในประกาศงานและหน้าข้อความ"
        actions={
          <Button variant="brand" size="md" icon={Save} onClick={save} loading={busy}>
            บันทึกโปรไฟล์
          </Button>
        }
      />

      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Building2 className="h-4 w-4 text-brand-600" />
              ข้อมูลบริษัท
            </h2>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Input
                label="ชื่อบริษัท / แบรนด์"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                error={errors.name}
                required
              />
              <Input
                label="ชื่อผู้ติดต่อ"
                value={values.contactName}
                onChange={(event) => setField('contactName', event.target.value)}
                error={errors.contactName}
                required
              />
              <Input
                label="ตำแหน่ง / คำอธิบายสั้น"
                value={values.title}
                onChange={(event) => setField('title', event.target.value)}
                error={errors.title}
                placeholder="เช่น Product & Brand Studio"
                required
              />
              <Input
                label="อุตสาหกรรม"
                value={values.industry}
                onChange={(event) => setField('industry', event.target.value)}
                placeholder="เช่น Software / SaaS"
              />
              <Input
                label="ที่ตั้ง"
                value={values.location}
                onChange={(event) => setField('location', event.target.value)}
                placeholder="กรุงเทพฯ"
              />
              <Input
                label="เว็บไซต์"
                type="url"
                value={values.website}
                onChange={(event) => setField('website', event.target.value)}
                error={errors.website}
                placeholder="https://example.com"
              />
            </div>
            <div className="mt-3.5">
              <Textarea
                label="เกี่ยวกับบริษัท"
                rows={4}
                value={values.bio}
                onChange={(event) => setField('bio', event.target.value)}
                error={errors.bio}
                hint="อธิบายว่าทีมคุณทำอะไรและทำงานกับฟรีแลนซ์อย่างไร"
                placeholder="เล่าเกี่ยวกับทีม ธุรกิจ และวัฒนธรรมการทำงาน…"
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">รูปโปรไฟล์</h2>
            <p className="mt-1 text-[11.5px] text-ink-500">
              เวอร์ชันนี้ใช้ avatar แบบสี Gradients (ยังไม่มีระบบอัปโหลดรูป)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setField('avatarColor', color)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white transition',
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
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={refresh} disabled={busy}>
              รีเซ็ตการแก้ไข
            </Button>
            <Button type="submit" variant="brand" icon={Save} loading={busy}>
              บันทึกโปรไฟล์
            </Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              ตัวอย่างโปรไฟล์
            </p>
            <ProfileCard
              client={{
                ...client,
                ...values,
                verified: client.verified,
              }}
            />
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold">สถานะบัญชี</h2>
            <div className="mt-3 space-y-2.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">การยืนยันตัวตน</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {client.verified ? 'ยืนยันแล้ว' : 'รอการยืนยัน'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">สมาชิกตั้งแต่</span>
                <span className="font-semibold text-ink">{client.memberSince}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">งานที่ประกาศ</span>
                <span className="font-semibold text-ink">{client.jobsPosted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">อัตราการจ้าง</span>
                <span className="font-semibold text-ink">{client.hireRate}%</span>
              </div>
            </div>
            <Button to="/client/history" variant="secondary" size="sm" className="mt-4 w-full">
              ดูประวัติการจ้าง
            </Button>
          </div>

          <InfoBanner tone="warning" title="ข้อมูลจำลอง">
            โปรไฟล์นี้ไม่ผูกกับระบบยืนยันตัวตนหรือฐานข้อมูลจริง
            — การเปลี่ยนแปลงมีผลเฉพาะในเบราว์เซอร์ของคุณ
          </InfoBanner>
        </aside>
      </form>
    </div>
  )
}
