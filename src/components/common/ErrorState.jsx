import { AlertOctagon, RotateCw } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/utils/cn'

export function ErrorState({ title = 'โหลดข้อมูลไม่สำเร็จ', error, onRetry, className }) {
  const message =
    error?.message || 'เกิดข้อผิดพลาดระหว่างเชื่อมต่อข้อมูล กรุณาลองใหม่อีกครั้ง'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/50 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
        <AlertOctagon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry} icon={RotateCw}>
          ลองอีกครั้ง
        </Button>
      )}
    </div>
  )
}
