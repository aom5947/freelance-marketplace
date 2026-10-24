import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchX, Sparkles, UsersRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchBar } from '@/components/common/SearchBar'
import { CategoryChip } from '@/components/common/CategoryChip'
import { FreelancerCard } from '@/components/profile/FreelancerCard'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/FormField'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { profileService } from '@/services/api/profileService'
import { availabilityOptions } from '@/constants'

const PAGE_SIZE = 6

const popularSkills = [
  'Product Design',
  'Figma',
  'React',
  'Design System',
  'Motion Design',
  'Copywriting',
  'SQL',
  'Brand Identity',
]

export default function FreelancerDirectory() {
  useDocumentTitle('ค้นหาฟรีแลนซ์')
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 350)
  const [skill, setSkill] = useState('')
  const [availability, setAvailability] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [debounced, skill, availability])

  const { data, loading, error, refresh } = useAsync(
    () => profileService.listFreelancers({ q: debounced, skill, availability }),
    [debounced, skill, availability],
  )

  const freelancers = data || []
  const pageCount = Math.max(1, Math.ceil(freelancers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = useMemo(
    () => freelancers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [freelancers, currentPage],
  )

  const reset = () => {
    setQuery('')
    setSkill('')
    setAvailability('')
    setPage(1)
  }

  return (
    <div className="pt-[72px]">
      <div className="relative border-b border-ink/[0.06] bg-white">
        <div className="surface-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="absolute left-1/3 top-0 h-52 w-52 rounded-full bg-violet-200/40 blur-[80px]" aria-hidden="true" />
        <div className="container-page relative py-10 sm:py-12">
          <PageHeader
            eyebrow="Freelancer directory"
            title="คนเก่งที่พร้อมทำงานกับคุณ"
            description="ค้นหาจากทักษะ ตำแหน่ง และสถานะการรับงาน — ดูผลงานและรีวิวก่อนตัดสินใจจ้าง"
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="ค้นหาชื่อ ตำแหน่ง หรือทักษะ เช่น Product Designer…"
              size="lg"
            />
            <Select
              aria-label="สถานะการรับงาน"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              className="h-[52px]"
            >
              <option value="">ทุกสถานะ</option>
              {availabilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
              <Sparkles className="h-3 w-3" /> ทักษะยอดนิยม
            </span>
            {popularSkills.map((item) => (
              <CategoryChip
                key={item}
                active={skill === item}
                onClick={() => setSkill(skill === item ? '' : item)}
              >
                {item}
              </CategoryChip>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-8 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <UsersRound className="h-4 w-4 text-brand-600" />
            {loading ? 'กำลังโหลดโปรไฟล์…' : `${freelancers.length} ฟรีแลนซ์ในระบบ`}
          </p>
          {(query || skill || availability) && (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] font-semibold text-ink-500 transition hover:text-rose-600"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="ไม่พบฟรีแลนซ์ที่ตรงกับเงื่อนไข"
            description="ลองเลือกทักษะอื่น หรือล้างตัวกรองเพื่อดูโปรไฟล์ทั้งหมดในข้อมูลตัวอย่าง"
            action={
              <Button variant="secondary" onClick={reset}>
                ล้างตัวกรอง
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((freelancer, index) => (
                <motion.div
                  key={freelancer.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                >
                  <FreelancerCard freelancer={freelancer} />
                </motion.div>
              ))}
            </div>
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onChange={setPage}
              className="mt-8"
            />
          </>
        )}

        <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/50 px-5 py-4 text-center">
          <p className="text-[12.5px] text-ink-600">
            ต้องการให้ทีมช่วยเลือกฟรีแลนซ์ที่เหมาะกับโจทย์ของคุณ?{' '}
            <Link to="/help" className="font-semibold text-brand-700 hover:underline">
              ดูคำแนะนำการจ้างงาน →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
