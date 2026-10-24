import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

const highlights = [
  { icon: ShieldCheck, title: 'Escrow-protected', text: 'เงินถูกเก็บอย่างปลอดภัยและปล่อยเมื่อตรวจรับงาน' },
  { icon: Sparkles, title: 'คัดสรรฟรีแลนซ์', text: 'ดูผลงาน รีวิว และอัตราความสำเร็จก่อนตัดสินใจ' },
  { icon: Wallet, title: 'พร้อมเชื่อม Wallet', text: 'UI เตรียมไว้สำหรับ smart-contract escrow ในอนาคต' },
]

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <Logo />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              กลับหน้าแรก
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[420px]">
              <Outlet />
            </div>
          </div>
          <p className="text-center text-[11px] text-ink-400">
            การเข้าใช้งานถือว่ายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว (ข้อมูลจำลอง)
          </p>
        </div>

        <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="surface-grid-dark absolute inset-0" aria-hidden="true" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-brand-600/30 blur-[100px]" aria-hidden="true" />
          <div className="absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-violet-600/25 blur-[100px]" aria-hidden="true" />

          <div className="relative flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-brand-200">
              <Sparkles className="h-3 w-3" />
              Built for focused work
            </span>
          </div>

          <div className="relative max-w-md">
            <h2 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-white">
              งานดี ๆ เกิดขึ้น
              <br />
              เมื่อคนที่ใช่
              <br />
              <span className="text-gradient-soft">เจอกัน</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/55">
              Freelink รวมประกาศงาน ฟรีแลนซ์คุณภาพ และระบบชำระเงินที่ตรวจสอบได้
              ไว้ในพื้นที่ทำงานเดียว
            </p>

            <div className="mt-9 space-y-3">
              {highlights.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-brand-200">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/45">{item.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="flex -space-x-2">
              {['from-indigo-400 to-violet-500', 'from-sky-400 to-blue-500', 'from-rose-400 to-orange-400'].map(
                (color, index) => (
                  <span
                    key={index}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-gradient-to-br ${color} text-[9px] font-bold text-white`}
                  >
                    {['NC', 'PA', 'MT'][index]}
                  </span>
                ),
              )}
            </div>
            <div className="text-[11px] leading-relaxed text-white/50">
              <span className="font-semibold text-white">12,400+ ฟรีแลนซ์</span> พร้อมรับงานของคุณ
              <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> verified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
