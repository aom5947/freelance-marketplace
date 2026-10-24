import { Link } from 'react-router-dom'
import { ArrowUpRight, BadgeCheck, MapPin } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { RatingStars } from '@/components/common/RatingStars'
import { StatusBadge } from '@/components/common/StatusBadge'
import { availabilityOptions } from '@/constants'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'

export function FreelancerCard({ freelancer, to, actions, className }) {
  if (!freelancer) return null
  const availability = availabilityOptions.find((option) => option.value === freelancer.availability)

  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={freelancer.name} color={freelancer.avatarColor} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={to || `/freelancers/${freelancer.id}`}
                className="truncate text-[15px] font-bold text-ink transition hover:text-brand-700"
              >
                {freelancer.name}
              </Link>
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-500" aria-label="ฟรีแลนซ์ยืนยันตัวตน" />
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-500">{freelancer.title}</p>
            <div className="mt-1.5">
              <RatingStars rating={freelancer.rating} count={freelancer.reviewsCount} showValue />
            </div>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/[0.07] text-ink-400 transition group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-600">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-ink-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {freelancer.location}
        </span>
        <span className="text-ink-300">•</span>
        <span>
          <strong className="font-semibold text-ink">{formatCurrency(freelancer.hourlyRate)}</strong>/ชม.
        </span>
        <span className="text-ink-300">•</span>
        <span>{freelancer.completedJobs} งานสำเร็จ</span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {(freelancer.skills || []).slice(0, 4).map((skill) => (
          <span key={skill} className="rounded-md border border-ink/[0.07] bg-paper-soft px-2 py-0.5 text-[11px] font-medium text-ink-600">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink/[0.06] pt-4">
        {availability && (
          <StatusBadge
            tone={availability.tone}
            label={availability.label}
            pulse={freelancer.availability === 'open'}
          />
        )}
        <div className="flex items-center gap-2">
          {actions || (
            <Link
              to={to || `/freelancers/${freelancer.id}`}
              className="text-xs font-semibold text-brand-700 transition hover:text-brand-800"
            >
              ดูโปรไฟล์ →
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
