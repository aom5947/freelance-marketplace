import { Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/common/Avatar'
import { RatingStars } from '@/components/common/RatingStars'
import { StatusBadge } from '@/components/common/StatusBadge'
import { proposalStatus } from '@/constants'
import { formatCurrency, timeAgo, truncate } from '@/utils/format'
import { cn } from '@/utils/cn'

export function ProposalCard({ proposal, actions, showJob = false, className }) {
  if (!proposal) return null
  const status = proposalStatus[proposal.status] || proposalStatus.pending
  const freelancer = proposal.freelancer

  return (
    <article className={cn('card p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={freelancer?.name || 'Freelancer'}
            color={freelancer?.avatarColor}
            size="md"
          />
          <div className="min-w-0">
            <Link
              to={freelancer ? `/freelancers/${freelancer.id}` : '#'}
              className="truncate text-sm font-bold text-ink transition hover:text-brand-700"
            >
              {freelancer?.name || 'ฟรีแลนซ์'}
            </Link>
            <p className="truncate text-xs text-ink-500">{freelancer?.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RatingStars rating={freelancer?.rating || 0} showValue size="xs" />
              {freelancer?.location && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-400">
                  <MapPin className="h-2.5 w-2.5" />
                  {freelancer.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      {showJob && proposal.job && (
        <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink-600">
          งาน: <span className="font-semibold text-ink">{proposal.job.title}</span>
        </p>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-ink-600">
        {truncate(proposal.coverLetter, 220)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-ink/[0.06] bg-paper-soft p-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-400">ราคาเสนอ</p>
          <p className="text-sm font-bold text-ink">{formatCurrency(proposal.bidAmount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-400">ระยะเวลา</p>
          <p className="text-sm font-bold text-ink">{proposal.deliveryDays} วัน</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-wide text-ink-400">ส่งเมื่อ</p>
          <p className="inline-flex items-center gap-1 text-sm font-medium text-ink">
            <Clock3 className="h-3 w-3" />
            {timeAgo(proposal.createdAt)}
          </p>
        </div>
      </div>

      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </article>
  )
}
