import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { HeroVisual } from '@/components/three/HeroVisual'
import { SectionHeading } from '@/components/common/SectionHeading'
import { ScrollReveal } from '@/components/common/ScrollReveal'
import { AnimatedCounter } from '@/components/common/AnimatedCounter'
import { JobCard } from '@/components/jobs/JobCard'
import { FreelancerCard } from '@/components/profile/FreelancerCard'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { RatingStars } from '@/components/common/RatingStars'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { Button } from '@/components/common/Button'
import { categories } from '@/constants'
import { jobService } from '@/services/api/jobService'
import { profileService } from '@/services/api/profileService'
import { partnerLogos, testimonials } from '@/data/mockData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatCurrency } from '@/utils/format'

const stats = [
  { value: 12400, suffix: '+', label: 'ฟรีแลนซ์ที่ผ่านการคัดสรร' },
  { value: 3400, suffix: '+', label: 'งานที่จบสำเร็จบนแพลตฟอร์ม' },
  { value: 48, prefix: '฿', suffix: 'M', label: 'มูลค่างานที่คุ้มครองด้วย Escrow' },
]

const steps = [
  {
    icon: Search,
    step: '01',
    title: 'โพสต์งานหรือค้นหาคน',
    description: 'อธิบายโจทย์ งบประมาณ และไทม์ไลน์ แล้วปล่อยให้ฟรีแลนซ์ที่เหมาะส่งข้อเสนอเข้ามา',
  },
  {
    icon: Users,
    step: '02',
    title: 'เปรียบเทียบและเลือก',
    description: 'ดูผลงานจริง คะแนนรีวิว และราคาที่ชัดเจน พร้อมคุยรายละเอียดก่อนตัดสินใจ',
  },
  {
    icon: FileCheck2,
    step: '03',
    title: 'ทำงานและตรวจรับ',
    description: 'ติดตามความคืบหน้าในหน้าโครงการ ส่งงาน ตรวจรับ และขอแก้ไขได้ในที่เดียว',
  },
  {
    icon: Wallet,
    step: '04',
    title: 'ปล่อยเงินอย่างปลอดภัย',
    description: 'เงินอยู่ใน escrow ตั้งแต่เริ่มงาน และปล่อยให้ฟรีแลนซ์เมื่อคุณอนุมัติ',
  },
]

const heroFeatures = [
  { icon: ShieldCheck, label: 'Escrow protection' },
  { icon: BadgeCheck, label: 'Verified freelancers' },
  { icon: Zap, label: 'Fast proposals' },
]

export default function LandingPage() {
  useDocumentTitle(null)
  const reduced = useReducedMotion()
  const [jobs, setJobs] = useState([])
  const [freelancers, setFreelancers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      jobService.listJobs({ status: 'open' }),
      profileService.listFreelancers({}),
    ])
      .then(([jobItems, freelancerItems]) => {
        if (!active) return
        setJobs(jobItems)
        setFreelancers(freelancerItems)
      })
      .catch(() => {
        if (active) {
          setJobs([])
          setFreelancers([])
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const featuredJobs = jobs.filter((job) => job.featured).slice(0, 3)
  const featuredFreelancers = freelancers.slice(0, 3)

  return (
    <>
      {/* ---------------------------------------------------------------- HERO */}
      <section className="relative overflow-hidden pt-[72px]">
        <div className="absolute inset-0 bg-soft-fade" aria-hidden="true" />
        <div className="surface-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute -right-32 top-4 h-[540px] w-[540px] rounded-full bg-brand-400/20 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="absolute -left-32 bottom-0 h-[380px] w-[380px] rounded-full bg-violet-400/15 blur-[110px]"
          aria-hidden="true"
        />

        <div className="container-page relative grid min-h-[calc(100vh-72px)] items-center gap-8 py-12 lg:grid-cols-[1.03fr_0.97fr] lg:gap-4 lg:py-16">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold text-brand-700 shadow-sm backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
              </span>
              Escrow-protected freelance marketplace
            </span>

            <h1 className="mt-5 text-[42px] font-extrabold leading-[1.06] tracking-[-0.04em] text-ink sm:text-6xl">
              จ้างคนเก่ง
              <br />
              ให้งาน
              <span className="relative inline-block">
                <span className="text-gradient">จบตรงเวลา</span>
                <svg
                  className="absolute -bottom-2 left-0 h-2.5 w-full text-brand-300/70"
                  viewBox="0 0 200 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2 7C52 2 142 2 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-6 max-w-[540px] text-[15px] leading-relaxed text-ink-500 sm:text-base">
              ค้นหาฟรีแลนซ์จากผลงานจริง เปรียบเทียบข้อเสนออย่างโปร่งใส
              และทำงานร่วมกันจนจบ พร้อมระบบ Escrow ที่ทำให้ทั้งสองฝ่ายมั่นใจ
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Button to="/freelancers" variant="brand" size="lg" icon={Search} iconRight={ArrowRight}>
                ค้นหาฟรีแลนซ์
              </Button>
              <Button to="/register" variant="secondary" size="lg" icon={ArrowUpRight}>
                เริ่มรับงาน
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {freelancers.slice(0, 3).map((freelancer) => (
                    <span
                      key={freelancer.id}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper bg-gradient-to-br ${freelancer.avatarColor} text-[9px] font-bold text-white`}
                    >
                      {freelancer.name.slice(0, 2)}
                    </span>
                  ))}
                </div>
                <div className="text-[11.5px] leading-tight">
                  <div className="flex items-center gap-1">
                    <RatingStars rating={4.9} size="xs" />
                    <span className="font-bold text-ink">4.9</span>
                  </div>
                  <span className="text-ink-400">จาก 2,300+ รีวิว</span>
                </div>
              </div>
              <span className="hidden h-8 w-px bg-ink/10 sm:block" />
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {heroFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <span key={feature.label} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-500">
                      <Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                      {feature.label}
                    </span>
                  )
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative mx-auto flex aspect-square w-full max-w-[560px] items-center justify-center lg:max-w-none"
          >
            <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.20),transparent_68%)] blur-2xl" aria-hidden="true" />
            <div className="h-full w-full">
              <HeroVisual className="h-full w-full" />
            </div>

            <motion.div
              animate={reduced ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-0 top-[16%] hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 pr-4 shadow-lift backdrop-blur-md sm:flex"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Proposal accepted</p>
                <p className="text-xs font-bold text-ink">฿52,000 · 21 วัน</p>
              </div>
            </motion.div>

            <motion.div
              animate={reduced ? {} : { y: [0, 10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-[15%] right-0 hidden w-[190px] rounded-2xl border border-white/70 bg-white/90 p-3.5 shadow-lift backdrop-blur-md sm:block"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                  <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                  Escrow funded
                </span>
                <span className="text-[9px] font-semibold text-ink-400">MOCK</span>
              </div>
              <p className="mt-2 text-lg font-extrabold tracking-tight text-ink">฿52,000</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div className="h-full w-[65%] rounded-full bg-brand-gradient" />
              </div>
              <p className="mt-1.5 text-[10px] text-ink-400">Milestone 2 of 4 · 65%</p>
            </motion.div>

            <span className="absolute right-[12%] top-[10%] hidden items-center gap-1.5 rounded-full border border-brand-200/70 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-brand-700 shadow-sm backdrop-blur md:inline-flex">
              <Sparkles className="h-3 w-3" />
              Live WebGL scene
            </span>
          </motion.div>
        </div>

        <div className="relative border-y border-ink/[0.06] bg-white/40 backdrop-blur-sm">
          <div className="container-page flex flex-col items-center gap-5 py-6 sm:flex-row sm:justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              ทีมและธุรกิจที่ใช้งาน
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-50">
              {partnerLogos.map((logo, index) => (
                <span
                  key={logo}
                  className={`text-[13px] font-extrabold tracking-tight text-ink ${
                    index % 2 === 0 ? 'font-display' : ''
                  }`}
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- STATS */}
      <section className="bg-white">
        <div className="container-page grid gap-6 py-12 sm:grid-cols-3 sm:divide-x sm:divide-ink/[0.07] sm:py-14">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.06} className="sm:px-8 first:sm:pl-0 last:sm:pr-0">
              <p className="text-4xl font-extrabold tracking-tight text-ink">
                <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </p>
              <p className="mt-1.5 text-[12.5px] text-ink-500">{stat.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- CATEGORIES */}
      <section className="section">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <ScrollReveal>
              <SectionHeading
                eyebrow="Explore categories"
                title="เริ่มจากทักษะที่คุณต้องการ"
                description="ไม่ว่าจะเป็นงานออกแบบ เว็บแอป หรือการตลาด — มีฟรีแลนซ์ที่พร้อมเริ่มงานในทุกหมวด"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
              >
                ดูงานทั้งหมด
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ScrollReveal>
          </div>

          <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => {
              const Icon = category.icon
              const count = jobs.filter((job) => job.category === category.id).length
              return (
                <ScrollReveal key={category.id} delay={index * 0.05}>
                  <Link
                    to={`/jobs?category=${category.id}`}
                    className="group flex h-full items-start gap-4 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${category.accent} text-white shadow-sm`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[14.5px] font-bold text-ink transition group-hover:text-brand-700">
                          {category.label}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                        {category.description}
                      </span>
                      <span className="mt-2.5 inline-flex rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                        {count > 0 ? `${count} งานที่เปิดรับ` : 'พร้อมรับงาน'}
                      </span>
                    </span>
                  </Link>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- FEATURED JOBS */}
      <section className="border-y border-ink/[0.06] bg-white section">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <ScrollReveal>
              <SectionHeading
                eyebrow="Featured opportunities"
                title="งานที่ทีมคัดมาแล้ว"
                description="ประกาศงานจากลูกค้าที่ผ่านการยืนยัน พร้อมขอบเขตงานและงบประมาณที่ชัดเจน"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <Button to="/jobs" variant="secondary" size="sm" iconRight={ArrowRight}>
                ดูประกาศทั้งหมด
              </Button>
            </ScrollReveal>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} />)
              : featuredJobs.map((job, index) => (
                  <ScrollReveal key={job.id} delay={index * 0.07}>
                    <JobCard job={job} />
                  </ScrollReveal>
                ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- HOW IT WORKS */}
      <section className="section">
        <div className="container-page">
          <ScrollReveal>
            <SectionHeading
              eyebrow="How freelink works"
              title="จากโจทย์ถึงงานที่จบ ใน 4 ขั้นตอน"
              description="ออกแบบ workflow ให้ทั้งลูกค้าและฟรีแลนซ์เห็นภาพเดียวกันทุกช่วงของงาน"
              align="center"
            />
          </ScrollReveal>

          <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-brand-100 via-brand-300 to-violet-200 lg:block" aria-hidden="true" />
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.step} delay={index * 0.08} className="relative">
                  <div className="flex h-full flex-col rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-white">
                          {step.step}
                        </span>
                      </span>
                      <span className="font-display text-2xl font-extrabold text-ink/[0.07]">{step.step}</span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-bold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{step.description}</p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- FREELANCERS */}
      <section className="border-y border-ink/[0.06] bg-white section">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <ScrollReveal>
              <SectionHeading
                eyebrow="Freelancer spotlight"
                title="คนเก่งที่พร้อมเริ่มงานคุณ"
                description="โปรไฟล์ที่แสดงผลงานจริง คะแนนรีวิว และอัตราความสำเร็จอย่างโปร่งใส"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <Button to="/freelancers" variant="secondary" size="sm" iconRight={ArrowRight}>
                ดูฟรีแลนซ์ทั้งหมด
              </Button>
            </ScrollReveal>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} />)
              : featuredFreelancers.map((freelancer, index) => (
                  <ScrollReveal key={freelancer.id} delay={index * 0.07}>
                    <FreelancerCard freelancer={freelancer} />
                  </ScrollReveal>
                ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- ESCROW */}
      <section className="section">
        <div className="container-page">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
              <div className="surface-grid-dark absolute inset-0" aria-hidden="true" />
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/25 blur-[90px]" aria-hidden="true" />
              <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-violet-500/20 blur-[90px]" aria-hidden="true" />

              <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Escrow & blockchain ready
                  </span>
                  <h2 className="mt-5 max-w-lg text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl">
                    เงินของคุณ
                    <span className="text-gradient-soft"> ปลอดภัยทุก milestone</span>
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
                    ลูกค้าฝากเงินเข้า escrow ก่อนเริ่มงาน ฟรีแลนซ์เห็นสถานะชัดเจน
                    และเงินจะถูกปล่อยเมื่อลูกค้าตรวจรับ — โครงสร้างนี้พร้อมเชื่อมต่อ Solidity
                    Smart Contract ของทีม
                  </p>

                  <ul className="mt-7 space-y-2.5">
                    {[
                      'สถานะ escrow แยกตามโครงการและ milestone',
                      'Transition ครบ: pending / confirmed / failed',
                      'รองรับการปฏิเสธธุรกรรมจากผู้ใช้',
                      'หน้าจอพร้อมสำหรับ ABI และ Contract Address จริง',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-white/70">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex flex-wrap items-center gap-2.5">
                    <WalletConnectButton variant="dark" size="md" dark />
                    <Link
                      to="/how-it-works"
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white/70 transition hover:text-white"
                    >
                      อ่านเรื่องความปลอดภัย
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Escrow flow</p>
                      <p className="mt-1 text-sm font-bold text-white">Landing Page & Design System</p>
                    </div>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[9px] font-semibold text-amber-200">
                      MOCK DATA
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      { label: 'ลูกค้าฝากเงินเข้า escrow', amount: '฿52,000', state: 'confirmed' },
                      { label: 'Milestone 1 ตรวจรับแล้ว', amount: '฿12,000', state: 'confirmed' },
                      { label: 'Milestone 2 กำลังดำเนินการ', amount: '฿16,000', state: 'pending' },
                      { label: 'รอตรวจรับงานสุดท้าย', amount: '฿24,000', state: 'waiting' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-800/70 px-3.5 py-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            row.state === 'confirmed'
                              ? 'bg-emerald-400/15 text-emerald-300'
                              : row.state === 'pending'
                                ? 'bg-amber-400/15 text-amber-300'
                                : 'bg-white/[0.06] text-white/40'
                          }`}
                        >
                          {row.state === 'confirmed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11.5px] font-medium text-white/80">{row.label}</p>
                          <p className="text-[10px] text-white/35">ข้อมูลจำลอง · ยังไม่ผูกกับ blockchain</p>
                        </div>
                        <span className="text-xs font-bold text-white/80">{row.amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                    <span className="text-[10px] text-white/45">Contract status</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      รอ ABI / Address จากทีม
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- TESTIMONIALS */}
      <section className="pb-20 sm:pb-24">
        <div className="container-page">
          <ScrollReveal>
            <SectionHeading
              eyebrow="Loved by both sides"
              title="เรื่องราวจากคนที่ใช้งานจริง"
              description="ความคิดเห็นจากลูกค้าและฟรีแลนซ์ในข้อมูลตัวอย่างของแพลตฟอร์ม"
              align="center"
            />
          </ScrollReveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <ScrollReveal key={testimonial.id} delay={index * 0.07}>
                <figure className="flex h-full flex-col rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
                  <RatingStars rating={testimonial.rating} size="sm" />
                  <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-600">
                    “{testimonial.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-2.5 border-t border-ink/[0.06] pt-4">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.avatarColor} text-[10px] font-bold text-white`}
                    >
                      {testimonial.name.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink">{testimonial.name}</p>
                      <p className="text-[10.5px] text-ink-400">{testimonial.role}</p>
                    </div>
                    <Star className="ml-auto h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA */}
      <section className="container-page pb-20 sm:pb-24">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-200/60 bg-brand-50/60 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="surface-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="absolute left-1/2 top-0 h-40 w-[560px] -translate-x-1/2 rounded-full bg-brand-400/20 blur-[80px]" aria-hidden="true" />
            <div className="relative">
              <span className="eyebrow justify-center">Start today</span>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-[40px] sm:leading-[1.1]">
                งานถัดไปของคุณ
                <br className="hidden sm:block" /> เริ่มต้นได้ในไม่กี่นาที
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-500">
                สร้างประกาศงาน ค้นหาฟรีแลนซ์ หรือเริ่มรับงานในฐานะฟรีแลนซ์ —
                ลองใช้งาน workflow ทั้งหมดได้ทันทีด้วยข้อมูลตัวอย่าง
              </p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
                <Button to="/register" variant="brand" size="lg" iconRight={ArrowRight}>
                  เริ่มใช้งานฟรี
                </Button>
                <Button to="/jobs" variant="secondary" size="lg">
                  สำรวจประกาศงาน
                </Button>
              </div>
              <p className="mt-5 text-[11px] text-ink-400">
                ข้อมูลทั้งหมดในเวอร์ชันนี้เป็นข้อมูลจำลอง — {formatCurrency(52000)} จะไม่ถูกเรียกเก็บจริง
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  )
}
