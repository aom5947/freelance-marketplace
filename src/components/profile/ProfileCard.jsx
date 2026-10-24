import { BadgeCheck, Building2, MapPin, Star } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { cn } from '@/utils/cn'

export function ProfileCard({ client, className, compact = false }) {
  if (!client) return null
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center gap-3">
        <Avatar name={client.name} color={client.avatarColor} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-ink">{client.name}</p>
            {client.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-500" aria-label="ยืนยันแล้ว" />}
          </div>
          <p className="truncate text-xs text-ink-500">{client.title}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-ink">{client.rating}</span>
            <span>({client.reviews} รีวิว)</span>
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-ink-500">
              <MapPin className="h-3.5 w-3.5" />
              {client.location}
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-500">
              <Building2 className="h-3.5 w-3.5" />
              {client.industry}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-ink/[0.07] rounded-xl bg-paper-soft py-3 text-center">
            <div>
              <p className="text-sm font-bold text-ink">{client.jobsPosted}</p>
              <p className="text-[10px] text-ink-400">งานที่ประกาศ</p>
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{client.hireRate}%</p>
              <p className="text-[10px] text-ink-400">อัตราการจ้าง</p>
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{client.reviews}</p>
              <p className="text-[10px] text-ink-400">รีวิว</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
