import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SearchX, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchBar } from '@/components/common/SearchBar'
import { FilterPanel } from '@/components/common/FilterPanel'
import { JobCard } from '@/components/jobs/JobCard'
import { JobListSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/common/Button'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobService } from '@/services/api/jobService'
import { categories } from '@/constants'

const PAGE_SIZE = 6

const initialFilters = (params) => ({
  q: params.get('q') || '',
  category: params.get('category') || '',
  budgetType: '',
  minBudget: '',
  maxBudget: '',
  sort: 'recent',
})

export default function BrowseJobs() {
  useDocumentTitle('ค้นหางาน')
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const inDashboard = location.pathname.startsWith('/freelancer')
  const detailBase = inDashboard ? '/freelancer/jobs' : '/jobs'

  const [filters, setFilters] = useState(() => initialFilters(searchParams))
  const [queryInput, setQueryInput] = useState(() => searchParams.get('q') || '')
  const debouncedQuery = useDebouncedValue(queryInput, 350)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setFilters((current) =>
      current.q === debouncedQuery ? current : { ...current, q: debouncedQuery },
    )
    setPage(1)
  }, [debouncedQuery])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.category) params.set('category', filters.category)
    const next = params.toString()
    if (next !== searchParams.toString()) {
      setSearchParams(params, { replace: true })
    }
  }, [filters.q, filters.category, searchParams, setSearchParams])

  const {
    data: jobs,
    loading,
    error,
    refresh,
  } = useAsync(
    () => jobService.listJobs({ ...filters, status: 'open' }),
    [filters],
  )

  const items = jobs || []
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [items, currentPage],
  )

  const resetFilters = () => {
    setFilters({ q: '', category: '', budgetType: '', minBudget: '', maxBudget: '', sort: 'recent' })
    setQueryInput('')
    setPage(1)
  }

  const activeCategory = categories.find((category) => category.id === filters.category)
  const hasFilters =
    filters.q || filters.category || filters.budgetType || filters.minBudget || filters.maxBudget

  return (
    <div className="pt-[72px]">
      <div className="relative border-b border-ink/[0.06] bg-white">
        <div className="surface-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-brand-200/30 blur-[80px]" aria-hidden="true" />
        <div className="container-page relative py-10 sm:py-12">
          <PageHeader
            eyebrow="Browse opportunities"
            title="ค้นหางานที่ใช่สำหรับคุณ"
            description="กรองตามหมวดหมู่ งบประมาณ และประเภทงาน — ทุกประกาศในหน้านี้เป็นข้อมูลจำลองสำหรับทดสอบการค้นหา"
          />
          <div className="max-w-2xl">
            <SearchBar
              value={queryInput}
              onChange={setQueryInput}
              onSubmit={() => setPage(1)}
              size="lg"
              placeholder="ลองค้นหา “Design System”, “React” หรือ “Dashboard”…"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
              <Sparkles className="h-3 w-3" /> ยอดนิยม
            </span>
            {['React', 'Figma', 'Design System', 'Dashboard', 'Marketing'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setQueryInput(term)
                  setPage(1)
                }}
                className="rounded-full border border-ink/10 bg-white/80 px-2.5 py-1 text-[10.5px] font-medium text-ink-500 transition hover:border-brand-300 hover:text-brand-700"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-8 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-[270px] shrink-0 lg:block">
            <div className="sticky top-[88px]">
              <FilterPanel filters={filters} onChange={setFilters} onReset={resetFilters} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {loading ? 'กำลังค้นหา…' : `พบ ${items.length} งานที่เปิดรับ`}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-500">
                  {activeCategory ? `หมวด ${activeCategory.label}` : 'ทุกหมวดหมู่'}
                  {hasFilters && ' · ใช้ตัวกรองอยู่'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-500 transition hover:text-rose-600"
                  >
                    <X className="h-3 w-3" /> ล้าง
                  </button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={SlidersHorizontal}
                  className="lg:hidden"
                  onClick={() => setFiltersOpen((current) => !current)}
                >
                  ตัวกรอง
                </Button>
              </div>
            </div>

            {filtersOpen && (
              <div className="mb-5 lg:hidden">
                <FilterPanel filters={filters} onChange={setFilters} onReset={resetFilters} />
              </div>
            )}

            {loading ? (
              <JobListSkeleton count={6} />
            ) : error ? (
              <ErrorState error={error} onRetry={refresh} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="ไม่พบงานที่ตรงกับเงื่อนไข"
                description="ลองลดตัวกรอง เปลี่ยนหมวดหมู่ หรือค้นหาด้วยคำอื่น — ข้อมูลตัวอย่างมีอยู่หลายหมวดให้ทดลอง"
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    ล้างตัวกรองทั้งหมด
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {visible.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <JobCard job={job} to={`${detailBase}/${job.id}`} />
                    </motion.div>
                  ))}
                </div>
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  onChange={(next) => {
                    setPage(next)
                    window.scrollTo({ top: 180, behavior: 'smooth' })
                  }}
                  className="mt-8"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
