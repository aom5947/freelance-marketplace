import { Suspense, lazy, useMemo } from 'react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { detectWebGL } from './webgl'
import { SceneFallback } from './SceneFallback'

const Hero3DScene = lazy(() => import('./Hero3DScene'))

export function HeroVisual({ className = '' }) {
  const isMobile = useIsMobile()
  const supported = useMemo(() => detectWebGL(), [])

  if (!supported) {
    return (
      <div className={className}>
        <SceneFallback message="เบราว์เซอร์นี้ไม่รองรับ WebGL" />
      </div>
    )
  }

  return (
    <div
      className={className}
      role="img"
      aria-label="ฉาก 3D แบบเคลื่อนไหว แสดงเครือข่ายของลูกค้าและฟรีแลนซ์ที่เชื่อมต่อกัน"
    >
      <Suspense fallback={<SceneFallback loading />}>
        <Hero3DScene quality={isMobile ? 'low' : 'high'} />
      </Suspense>
    </div>
  )
}
