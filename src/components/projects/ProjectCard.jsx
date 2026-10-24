import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { escrowStatus, projectStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

export function ProjectCard({ project, role = 'client', to, className }) {
  if (!project) return null
  const status = projectStatus[project.status] || projectStatus.active
  const escrow = escrowStatus[project.escrowStatus] || escrowStatus.unfunded
  const counterpart = role === 'client' ? project.freelancer : project.client

  return (
    <Link
      to={to || `/${role}/projects/${project.id}`}
      className={cn(
        'group card p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge label={status.label} tone={status.tone} pulse={project.status === 'active' || project.status === 'in_review'} />
          <StatusBadge label={escrow.label} tone={escrow.tone} />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-400 transition group-hover:text-brand-600" />
      </div>

      <h3 className="mt-3.5 line-clamp-2 text-[15px] font-bold leading-snug text-ink transition group-hover:text-brand-700">
        {project.title}
      </h3>

      <div className="mt-3 flex items-center gap-2">
        <Avatar name={counterpart?.name || '—'} color={counterpart?.avatarColor} size="xs" />
        <span className="truncate text-xs text-ink-500">
          {role === 'client' ? 'ฟรีแลนซ์: ' : 'ลูกค้า: '}
          <span className="font-semibold text-ink-600">{counterpart?.name || '—'}</span>
        </span>
      </div>

      <div className="mt-4">
        <ProgressBar value={project.progress} showLabel />
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-ink/[0.06] pt-3.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-400">มูลค่าโครงการ</p>
          <p className="text-sm font-bold text-ink">{formatCurrency(project.budget)}</p>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-1 text-[11px] text-ink-500">
            <CalendarDays className="h-3 w-3" />
            กำหนดส่ง {formatDate(project.dueDate, { day: 'numeric', month: 'short' })}
          </p>
          {project.escrowStatus === 'funded' && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              เงินอยู่ใน Escrow
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
