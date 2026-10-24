import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, Eye, EyeOff, Lock, Palette, ShieldCheck } from 'lucide-react'
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
    label: 'ฉันต้องการจ้างงาน',
    description: 'Client · โพสต์งานและจัดการโครงการ',
    icon: BriefcaseBusiness,
  },
  {
    value: 'freelancer',
    label: 'ฉันต้องการรับงาน',
    description: 'Freelancer · ส่งข้อเสนอและส่งงาน',
    icon: Palette,
  },
]

export default function Login() {
  useDocumentTitle('เข้าสู่ระบบ')
  const { signInWithRole, signInWithGoogle, user, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState('client')
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const target = location.state?.from || (role === 'client' ? '/client/dashboard' : '/freelancer/dashboard')

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values, {
      email: [required('อีเมล'), emailFormat()],
      password: [required('รหัสผ่าน'), minLength(6, 'รหัสผ่าน')],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await signInWithRole(role)
      toast.success('เข้าสู่ระบบสำเร็จ (Mock)', 'ระบบยังไม่ได้เชื่อมต่อ Authentication จริง')
      navigate(target, { replace: true })
    } catch (error) {
      toast.error('เข้าสู่ระบบไม่สำเร็จ', error.message)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle(role)
      toast.success('เข้าสู่ระบบด้วย Google (Mock)', MOCK_AUTH_NOTICE)
      navigate(target, { replace: true })
    } catch (error) {
      toast.error('Google Login ยังไม่พร้อมใช้งาน', error.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div>
      <span className="eyebrow">Welcome back</span>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">เข้าสู่ระบบ Freelink</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        เลือกบทบาทที่ต้องการทดลอง แล้วเข้าสู่ระบบด้วยบัญชีตัวอย่าง
      </p>

      {user && (
        <InfoBanner tone="info" className="mt-5" title={`คุณเข้าสู่ระบบอยู่ในฐานะ ${user.role}`}>
          <Link
            to={user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard'}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            ไปที่แดชบอร์ดของคุณ →
          </Link>
        </InfoBanner>
      )}

      <fieldset className="mt-6">
        <legend className="sr-only">เลือกบทบาท</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {roles.map((item) => {
            const Icon = item.icon
            const active = role === item.value
            return (
              <label
                key={item.value}
                className={cn(
                  'relative cursor-pointer rounded-xl border p-3.5 transition',
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
                <Icon className={cn('h-[18px] w-[18px]', active ? 'text-brand-600' : 'text-ink-400')} aria-hidden="true" />
                <p className="mt-2 text-[12.5px] font-bold text-ink">{item.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-400">{item.description}</p>
                {active && (
                  <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white">
                    ✓
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>

      <Button
        variant="secondary"
        size="lg"
        className="mt-5 w-full"
        onClick={handleGoogle}
        loading={googleLoading || loading}
      >
        <GoogleIcon className="h-4 w-4" />
        ดำเนินการต่อด้วย Google
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">หรือ</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-3.5">
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
        <div className="relative">
          <Input
            label="รหัสผ่าน"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
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

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-ink-400">บัญชีตัวอย่าง — ไม่ต้องใช้รหัสผ่านจริง</span>
          <button
            type="button"
            onClick={() =>
              toast.info(
                'ยังไม่เชื่อมต่อระบบรีเซ็ตรหัสผ่าน',
                'เมื่อเชื่อมต่อ Authentication จริงแล้ว ปุ่มนี้จะเปิด flow รีเซ็ตรหัสผ่าน',
              )
            }
            className="shrink-0 text-[11px] font-semibold text-ink-500 transition hover:text-brand-700"
          >
            ลืมรหัสผ่าน?
          </button>
        </div>

        <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
          <Lock className="h-4 w-4" />
          เข้าสู่ระบบ
        </Button>
      </form>

      <InfoBanner tone="warning" className="mt-5" title="Mock authentication">
        {MOCK_AUTH_NOTICE} — ระบบจะไม่เก็บรหัสผ่านของคุณ และไม่มีการตรวจสอบตัวตนจริง
        รองรับการเชื่อม Google OAuth / Firebase ในภายหลังผ่าน auth service
      </InfoBanner>

      <p className="mt-5 text-center text-[12.5px] text-ink-500">
        ยังไม่มีบัญชี?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          สมัครใช้งาน
        </Link>
      </p>

      <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-ink-400">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> ไม่เก็บ secret ใน frontend
        </span>
        <span className="inline-flex items-center gap-1">
          <Lock className="h-3 w-3" /> Session เก็บใน localStorage
        </span>
      </div>
    </div>
  )
}
