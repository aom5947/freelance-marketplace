import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { categories } from '@/constants'
import { CategoryChip } from './CategoryChip'
import { Input, Select } from './FormField'
import { Button } from './Button'
import { cn } from '@/utils/cn'

const sortOptions = [
  { value: 'recent', label: 'ล่าสุด' },
  { value: 'budget_desc', label: 'งบประมาณสูงสุด' },
  { value: 'budget_asc', label: 'งบประมาณต่ำสุด' },
  { value: 'proposals', label: 'ข้อเสนอน้อยที่สุด' },
]

export function FilterPanel({ filters, onChange, onReset, className, children, sortOptionsOverride }) {
  const set = (patch) => onChange?.({ ...filters, ...patch })

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden="true" />
          ตัวกรอง
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          รีเซ็ต
        </button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">หมวดหมู่</p>
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip active={!filters.category} onClick={() => set({ category: '' })}>
            ทั้งหมด
          </CategoryChip>
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              active={filters.category === category.id}
              icon={category.icon}
              onClick={() => set({ category: filters.category === category.id ? '' : category.id })}
            >
              {category.label.split(' ')[0]}
            </CategoryChip>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">ช่วงงบประมาณ</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="ต่ำสุด"
            aria-label="งบประมาณต่ำสุด"
            value={filters.minBudget ?? ''}
            onChange={(event) => set({ minBudget: event.target.value })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="สูงสุด"
            aria-label="งบประมาณสูงสุด"
            value={filters.maxBudget ?? ''}
            onChange={(event) => set({ maxBudget: event.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Select
          label="ประเภทงบประมาณ"
          value={filters.budgetType}
          onChange={(event) => set({ budgetType: event.target.value })}
        >
          <option value="">ทั้งหมด</option>
          <option value="fixed">ราคาเหมารวม</option>
          <option value="hourly">คิดรายชั่วโมง</option>
        </Select>
        <Select
          label="เรียงตาม"
          value={filters.sort}
          onChange={(event) => set({ sort: event.target.value })}
        >
          {(sortOptionsOverride || sortOptions).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {children}
      </div>

      <Button variant="subtle" size="sm" className="mt-5 w-full" onClick={onReset}>
        ล้างตัวกรองทั้งหมด
      </Button>
    </div>
  )
}
