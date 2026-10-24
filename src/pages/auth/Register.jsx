import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, Check, Eye, EyeOff, Palette, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/FormField'
import { InfoBanner } from '@/components/common/InfoBanner'
import { GoogleIcon } from '@/components/common/GoogleIcon'
import { MOCK_AUTH_NOTICE } from '@/services/mocks/mockAuthService'
import { validate, emailFormat, minLength, required } from '@/utils/validators'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/utils/cn'

const roles = [
  {
    value: 'client',
    title: 'Client',
    subtitle: 'จ้างฟรีแลนซ์',
    description: 'โพสต์งาน เปรียบเทียบข้อเสนอ และดูแลโครงการ',
    icon: BriefcaseBusiness,
    perks: ['สร้างประกาศงานไม่จำกัด', 'Escrow protection', 'ประวัติการจ้างงาน'],
  },
  {
    value: 'freelancer',
    title: 'Freelancer',
    subtitle: 'รับงาน',
    description: 'สร้างโปรไฟล์ ส่งข้อเสนอ และส่งงาน',
    icon: Palette,
    perks: ['โปรไฟล์ผลงาน', 'ติดตามสถานะข้อเสนอ', 'รายได้และประวัติธุรกรรม'],
  },
]

export default function Register() {
  useDocumentTitle('สมัครใช้งาน')
  const { signInWithRole, signInWithGoogle, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [role, setRole] = useState('client')
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '', terms: false })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values, {
      name: [required('ชื่อ'), minLength(2, 'ชื่อ')],
      email: [required('อีเมล'), emailFormat()],
      password: [required('รหัสผ่าน'), minLength(6, 'รหัสผ่าน')],
      confirm: [
        required('การยืนยันรหัสผ่าน'),
        (value) => (value !== values.password ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : null),
      ],
      terms: [(value) => (!value ? 'กรุณายอมรับข้อกำหนดการใช้งาน' : null)],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await signInWithRole(role, {
        name: values.name,
        displayName: values.name,
        email: values.email,
      })
      toast.success(
        'สร้างบัญชีจำลองสำเร็จ',
        'บัญชีนี้เก็บในเครื่องเท่านั้น — ยังไม่ได้เชื่อมต่อระบบสมาชิกจริง',
      )
      navigate(role === 'client' ? '/client/dashboard' : '/freelancer/dashboard', { replace: true })
    } catch (error) {
      toast.error('สร้างบัญชีไม่สำเร็จ', error.message)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle(role)
      toast.success('สมัครด้วย Google (Mock)', MOCK_AUTH_NOTICE)
      navigate(role === 'client' ? '/client/dashboard' : '/freelancer/dashboard', { replace: true })
    } catch (error) {
      toast.error('Google Sign-in ยังไม่พร้อมใช้งาน', error.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div>
      <span className="eyebrow">Create account</span>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">เริ่มต้นกับ Freelink</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        เลือกบทบาทและสร้างบัญชีตัวอย่างเพื่อทดลอง workflow ทั้งหมด
      </p>

      <fieldset className="mt-6">
        <legend className="sr-only">เลือกบทบาท</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {roles.map((item) => {
            const Icon = item.icon
            const active = role === item.value
            return (
              <label
                key={item.value}
                className={cn(
                  'relative cursor-pointer rounded-xl border p-4 transition',
                  active
                    ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15'
                    : 'border-ink/10 bg-white hover:border-brand-200',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={item.value}
                  checked={active}
                  onChange={() => setRole(item.value)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      active ? 'bg-brand-600 text-white' : 'bg-paper text-ink-500',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {active && (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-sm font-bold text-ink">
                  {item.title}
                  <span className="ml-1 text-[11px] font-medium text-ink-400">· {item.subtitle}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{item.description}</p>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 rounded-xl border border-ink/[0.07] bg-white p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          สิ่งที่คุณจะได้
        </p>
        <ul className="mt-2 grid gap-1">
          {roles.find((item) => item.value === role)?.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-1.5 text-[11.5px] text-ink-600">
              <Check className="h-3 w-3 text-emerald-500" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="secondary"
        size="lg"
        className="mt-4 w-full"
        onClick={handleGoogle}
        loading={googleLoading || loading}
      >
        <GoogleIcon className="h-4 w-4" />
        สมัครด้วย Google
      </Button>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">หรือ</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-3.5">
        <Input
          label="ชื่อที่แสดง"
          type="text"
          autoComplete="name"
          placeholder="เช่น Nimbus Studio หรือ ณัฐวุฒิ"
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          error={errors.name}
          required
        />
        <Input
          label="อีเมล"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          error={errors.email}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Input
              label="รหัสผ่าน"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={values.password}
              onChange={(event) => setValues({ ...values, password: event.target.value })}
              error={errors.password}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-[34px] rounded p-1 text-ink-400 transition hover:text-ink"
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            label="ยืนยันรหัสผ่าน"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="พิมพ์อีกครั้ง"
            value={values.confirm}
            onChange={(event) => setValues({ ...values, confirm: event.target.value })}
            error={errors.confirm}
            required
          />
        </div>

        <div>
          <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-500">
            <input
              type="checkbox"
              checked={values.terms}
              onChange={(event) => setValues({ ...values, terms: event.target.checked })}
              className="mt-0.5 h-3.5 w-3.5 rounded border-ink/20 text-brand-600 focus:ring-brand-500"
              aria-invalid={Boolean(errors.terms)}
            />
            <span>
              ฉันยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว (เวอร์ชันสาธิต)
            </span>
          </label>
          {errors.terms && <p className="mt-1 text-xs font-medium text-rose-600">{errors.terms}</p>}
        </div>

        <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading} iconRight={ArrowRight}>
          สร้างบัญชี
        </Button>
      </form>

      <InfoBanner tone="warning" className="mt-4" title="บัญชีสาธิต">
        {MOCK_AUTH_NOTICE} — ไม่มีการบันทึกหรือส่งรหัสผ่านออกจากเบราว์เซอร์
      </InfoBanner>

      <p className="mt-5 text-center text-[12.5px] text-ink-500">
        มีบัญชีอยู่แล้ว?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>

      <p className="mt-4 flex items-center justify-center gap-1 text-center text-[10px] text-ink-400">
        <ShieldCheck className="h-3 w-3" />
        ข้อมูลรับรองจะถูกแทนที่ด้วย OAuth / Backend authentication ภายหลัง
      </p>
    </div>
  )
}
