import { ArrowLeft, Compass, Search } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('ไม่พบหน้านี้')
  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden pt-[72px]">
      <div className="absolute inset-0 bg-soft-fade" aria-hidden="true" />
      <div className="surface-grid absolute inset-0" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-300/25 blur-[100px]" aria-hidden="true" />

      <div className="container-page relative py-20 text-center">
        <p className="font-display text-[110px] font-extrabold leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_rgba(99,102,241,0.35)] sm:text-[160px]">
          404
        </p>
        <div className="mx-auto -mt-4 max-w-lg">
          <span className="eyebrow justify-center">
            <Compass className="h-3 w-3" /> Lost in the workspace
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">ไม่พบหน้าที่คุณกำลังมองหา</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            ลิงก์อาจเปลี่ยนไปแล้ว หรือหน้านี้ยังไม่ได้ถูกสร้าง — กลับไปยังพื้นที่ทำงานหลัก
            หรือค้นหางานที่เปิดรับได้เลย
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button to="/" variant="brand" size="lg" icon={ArrowLeft}>
              กลับหน้าแรก
            </Button>
            <Button to="/jobs" variant="secondary" size="lg" icon={Search}>
              ค้นหางาน
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-ink-400">
            <Button to="/freelancers" variant="ghost" size="sm">
              ฟรีแลนซ์
            </Button>
            <Button to="/how-it-works" variant="ghost" size="sm">
              วิธีใช้งาน
            </Button>
            <Button to="/help" variant="ghost" size="sm">
              ช่วยเหลือ
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
