import { Link } from 'react-router-dom'
import { Github, Linkedin, Twitter } from 'lucide-react'
import { Logo } from './Logo'
import { appConfig } from '@/config/appConfig'

const columns = [
  {
    title: 'แพลตฟอร์ม',
    links: [
      { label: 'ค้นหางาน', to: '/jobs' },
      { label: 'ฟรีแลนซ์', to: '/freelancers' },
      { label: 'วิธีใช้งาน', to: '/how-it-works' },
      { label: 'ช่วยเหลือ / FAQ', to: '/help' },
    ],
  },
  {
    title: 'สำหรับลูกค้า',
    links: [
      { label: 'สร้างประกาศงาน', to: '/client/jobs/new' },
      { label: 'จัดการโครงการ', to: '/client/projects' },
      { label: 'ระบบ Escrow', to: '/wallet' },
      { label: 'ประวัติการจ้าง', to: '/client/history' },
    ],
  },
  {
    title: 'สำหรับฟรีแลนซ์',
    links: [
      { label: 'ค้นหางานใหม่', to: '/freelancer/jobs' },
      { label: 'ข้อเสนอของฉัน', to: '/freelancer/proposals' },
      { label: 'รายได้', to: '/freelancer/earnings' },
      { label: 'รีวิว', to: '/freelancer/reviews' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              พื้นที่ทำงานของคนเก่งและธุรกิจที่อยากเติบโต — ค้นหาฟรีแลนซ์คุณภาพ
              ทำงานร่วมกันอย่างโปร่งใส และชำระเงินผ่านระบบ Escrow ที่ตรวจสอบได้
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[Twitter, Linkedin, Github].map((Icon, index) => (
                <span
                  key={index}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/50"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
            <p className="mt-6 max-w-sm rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[11px] leading-relaxed text-white/40">
              Frontend demo — ข้อมูลทั้งหมดเป็นข้อมูลจำลอง และยังไม่ได้เชื่อมต่อ Backend
              หรือ Smart Contract จริง
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.to + link.label}>
                      <Link
                        to={link.to}
                        className="text-[13px] text-white/60 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} {appConfig.name}. Frontend built with React, Tailwind CSS
            and React Three Fiber.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-white/40">
            <Link to="/how-it-works" className="transition hover:text-white/70">
              นโยบาย Escrow
            </Link>
            <Link to="/help" className="transition hover:text-white/70">
              ติดต่อทีม
            </Link>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
              Mock data mode
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
