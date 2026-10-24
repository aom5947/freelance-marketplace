import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock3, ShieldCheck, Users } from 'lucide-react'
import { categoryMap } from '@/constants'
import { formatCurrency, timeAgo } from '@/utils/format'
import { Avatar } from '@/components/common/Avatar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/utils/cn'

export function JobCard({ job, to, className, compact = false }) {
  if (!job) return null
  const category = categoryMap[job.category]
  const CategoryIcon = category?.icon

  return (
    <Link
      to={to || `/jobs/${job.id}`}
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft transition duration-300 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift focus-visible:-translate-y-1',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {job.featured && (
            <span className="inline-flex items-center rounded-full bg-brand-gradient px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              แนะนำ
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-600">
            {CategoryIcon && <CategoryIcon className="h-3 w-3" aria-hidden="true" />}
            {category?.label || job.category}
          </span>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/[0.07] text-ink-400 transition group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-600">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>

      <h3 className="mt-3.5 text-[16.5px] font-bold leading-snug tracking-tight text-ink transition group-hover:text-brand-700">
        {job.title}
      </h3>

      {!compact && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
          {job.description}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {(job.skills || []).slice(0, compact ? 2 : 3).map((skill) => (
          <span key={skill} className="rounded-md border border-ink/[0.07] bg-paper-soft px-2 py-0.5 text-[11px] font-medium text-ink-600">
            {skill}
          </span>
        ))}
        {(job.skills || []).length > (compact ? 2 : 3) && (
          <span className="rounded-md px-1 py-0.5 text-[11px] text-ink-400">
            +{job.skills.length - (compact ? 2 : 3)}
          </span>
        )}
      </div>

      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-3 border-t border-ink/[0.06] pt-3.5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">งบประมาณ</p>
            <p className="text-sm font-bold text-ink">
              {formatCurrency(job.budgetMin, { compact: true })}
              <span className="mx-1 font-normal text-ink-300">–</span>
              {formatCurrency(job.budgetMax, { compact: true })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
              <Users className="h-3 w-3" aria-hidden="true" />
              {job.proposalsCount} ข้อเสนอ
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {timeAgo(job.createdAt)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={job.client?.name || 'Client'} color={job.client?.avatarColor} size="xs" />
            <span className="truncate text-[11.5px] font-medium text-ink-600">
              {job.client?.name || 'ลูกค้า'}
            </span>
            {job.client?.verified && (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-label="ยืนยันตัวตนแล้ว" />
            )}
          </div>
          {job.status !== 'open' && (
            <StatusBadge
              tone={job.status === 'in_progress' ? 'blue' : 'slate'}
              label={job.status === 'in_progress' ? 'กำลังทำ' : job.status === 'draft' ? 'ฉบับร่าง' : 'ปิดรับ'}
            />
          )}
        </div>
      </div>
    </Link>
  )
}
