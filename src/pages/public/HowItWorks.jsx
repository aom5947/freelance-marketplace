import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileCheck2,
  FileText,
  LockKeyhole,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { ScrollReveal } from '@/components/common/ScrollReveal'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Button } from '@/components/common/Button'
import { FaqAccordion } from '@/components/common/FaqAccordion'
import { InfoBanner } from '@/components/common/InfoBanner'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { faqs } from '@/data/mockData'
import { getMissingContractConfig, contractConfig, isContractConfigured } from '@/config/contractConfig'
import { cn } from '@/utils/cn'

const clientSteps = [
  {
    icon: FileText,
    title: 'โพสต์ประกาศงาน',
    description: 'ระบุโจทย์ ขอบเขตงาน งบประมาณ และไทม์ไลน์ให้ชัดเจน เพื่อให้ได้ข้อเสนอที่ตรงความต้องการ',
  },
  {
    icon: Search,
    title: 'เปรียบเทียบข้อเสนอ',
    description: 'ดูราคา ระยะเวลา คะแนนรีวิว และผลงานที่ผ่านมาในหน้าเดียว แล้วคัดเลือกคนที่ใช่',
  },
  {
    icon: LockKeyhole,
    title: 'จ้างและฝาก Escrow',
    description: 'ตกลง milestone แล้วฝากเงินเข้า escrow — ฟรีแลนซ์เห็นว่ามีเงินพร้อมจ่ายก่อนเริ่มงาน',
  },
  {
    icon: FileCheck2,
    title: 'ตรวจรับและอนุมัติ',
    description: 'ตรวจงานที่ส่งมา ขอแก้ไขได้ตามข้อตกลง และอนุมัติเพื่อปล่อยเงินให้ฟรีแลนซ์',
  },
]

const freelancerSteps = [
  {
    icon: Palette,
    title: 'สร้างโปรไฟล์ที่ขายงานได้',
    description: 'เพิ่มทักษะ ผลงาน และอัตราค่าจ้าง พร้อมเปิดสถานะรับงานเพื่อให้ลูกค้าค้นพบคุณ',
  },
  {
    icon: FileText,
    title: 'ส่งข้อเสนอที่ชัดเจน',
    description: 'อธิบายแนวทางทำงาน ราคา และระยะเวลาให้ลูกค้าเห็นภาพ — ติดตามสถานะได้ทุกขั้น',
  },
  {
    icon: BriefcaseBusiness,
    title: 'ทำงานและส่งมอบ',
    description: 'อัปเดตความคืบหน้า ส่งงานพร้อมไฟล์หรือลิงก์ และรับ feedback ผ่านหน้าโครงการ',
  },
  {
    icon: Wallet,
    title: 'รับเงินอย่างมั่นใจ',
    description: 'เมื่อลูกค้าอนุมัติ เงินจาก escrow จะถูกปล่อยเข้าบัญชีของคุณ พร้อมประวัติธุรกรรม',
  },
]

const escrowFlow = [
  { title: 'Fund', description: 'ลูกค้าฝากเงินเข้า escrow ของโครงการ' },
  { title: 'Build', description: 'ฟรีแลนซ์ทำงานตาม milestone ที่ตกลง' },
  { title: 'Review', description: 'ลูกค้าตรวจรับและขอแก้ไขได้ตามเงื่อนไข' },
  { title: 'Release', description: 'อนุมัติปล่อยเงินให้ฟรีแลนซ์' },
]

export default function HowItWorks() {
  useDocumentTitle('วิธีใช้งาน')
  const missing = getMissingContractConfig()

  return (
    <>
      <section className="relative overflow-hidden pt-[72px]">
        <div className="absolute inset-0 bg-soft-fade" aria-hidden="true" />
        <div className="surface-grid absolute inset-0" aria-hidden="true" />
        <div className="container-page relative py-16 text-center sm:py-20">
          <span className="eyebrow justify-center">
            <Sparkles className="h-3 w-3" /> How it works
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-5xl">
            ทำงานร่วมกันอย่างชัดเจน
            <br />
            <span className="text-gradient">ตั้งแต่โจทย์ถึงการจ่ายเงิน</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-500">
            Freelink ออกแบบ workflow ให้ลูกค้าและฟรีแลนซ์เห็นสถานะเดียวกันทุกขั้นตอน
            ลดความคลุมเครือเรื่องขอบเขตงาน งบประมาณ และการชำระเงิน
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button to="/jobs" variant="brand" size="lg" iconRight={ArrowRight}>
              สำรวจงานที่เปิดรับ
            </Button>
            <Button to="/register" variant="secondary" size="lg">
              เริ่มใช้งานฟรี
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-ink/[0.06] bg-white section">
        <div className="container-page">
          <ScrollReveal>
            <SectionHeading
              eyebrow="For clients"
              title="จ้างงานอย่างไรให้ได้ผลลัพธ์ที่ต้องการ"
              description="ทุกขั้นตอนมีหน้าจอรองรับ และทุกการตัดสินใจมีข้อมูลประกอบ"
            />
          </ScrollReveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clientSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.title} delay={index * 0.06}>
                  <div className="relative h-full rounded-2xl border border-ink/[0.07] bg-paper-soft/60 p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="absolute right-5 top-5 font-display text-2xl font-extrabold text-ink/[0.08]">
                      0{index + 1}
                    </span>
                    <h3 className="mt-4 text-sm font-bold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{step.description}</p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
          <div className="mt-6">
            <Button to="/client/jobs/new" variant="secondary" size="sm" iconRight={ArrowRight}>
              ลองสร้างประกาศงาน (Demo)
            </Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <ScrollReveal>
            <SectionHeading
              eyebrow="For freelancers"
              title="จากโปรไฟล์ถึงเงินเข้าบัญชี"
              description="โฟกัสที่งาน ไม่ต้องไล่ตามใบเสนอราคาและการจ่ายเงิน"
              align="center"
            />
          </ScrollReveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {freelancerSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.title} delay={index * 0.06}>
                  <div className="h-full rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[9px] font-bold text-ink-400">
                        STEP {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{step.description}</p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="container-page">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="surface-grid-dark absolute inset-0" aria-hidden="true" />
              <div className="absolute -right-16 top-0 h-64 w-64 rounded-full bg-brand-500/25 blur-[90px]" aria-hidden="true" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Escrow lifecycle
                </span>
                <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                  เงินถูกคุ้มครองทุกช่วงของงาน
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
                  ลูกค้าเห็นว่าเงินถูกใช้ไปกับอะไร ฟรีแลนซ์เห็นว่าเงินพร้อมจ่าย
                  และทั้งสองฝ่ายมีประวัติธุรกรรมให้ตรวจสอบ
                </p>

                <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {escrowFlow.map((step, index) => (
                    <div key={step.title} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">
                          {step.title}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-[10px] font-bold text-white/60">
                          {index + 1}
                        </span>
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-white/60">{step.description}</p>
                      {index < escrowFlow.length - 1 && (
                        <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-white/15 lg:block" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      Frontend พร้อมแล้ว
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {[
                        'หน้าจอ wallet / escrow / transaction',
                        'สถานะ pending, confirmed, failed',
                        'จัดการการปฏิเสธจากผู้ใช้',
                        'Service layer สำหรับ ethers.js',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-[11.5px] text-white/65">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">
                      รอข้อมูลจากทีม Smart Contract
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {missing.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-[11.5px] text-white/50">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2.5 text-[10px] text-white/35">
                      สถานะสัญญา: {isContractConfigured() ? 'พร้อมใช้งาน' : 'ยังไม่เชื่อมต่อ'} · Chain ID:{' '}
                      {contractConfig.chainId || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-t border-ink/[0.06] bg-white section">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <ScrollReveal>
              <SectionHeading
                eyebrow="Trust & safety"
                title="คำถามที่พบบ่อย"
                description="เรื่องที่ลูกค้าและฟรีแลนซ์ถามบ่อยเกี่ยวกับการทำงานและการชำระเงิน"
              />
              <InfoBanner tone="warning" className="mt-6" title="สถานะโปรเจกต์">
                นี่คือ Frontend ที่ใช้ mock data — ยังไม่มีการเชื่อมต่อ Backend หรือ
                Smart Contract จริง หน้าจอที่เกี่ยวกับเงินจะแสดงสถานะ “ยังไม่เชื่อมต่อ”
                จนกว่าทีมจะส่งข้อมูลมา
              </InfoBanner>
              <Link
                to="/help"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
              >
                ไปที่ศูนย์ช่วยเหลือ
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <FaqAccordion items={faqs} defaultOpen="faq1" />
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-10 text-center">
          <div className="surface-grid absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              พร้อมเริ่มงานถัดไปแล้วหรือยัง?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-500">
              ทดลอง workflow ทั้งหมดได้ทันทีด้วยบัญชีตัวอย่าง — ไม่ต้องใช้ข้อมูลจริง
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button to="/register" variant="brand" size="md" iconRight={ArrowRight}>
                สร้างบัญชี demo
              </Button>
              <Button to="/jobs" variant="secondary" size="md">
                ดูประกาศงาน
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
