import { Orbit } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Lightweight CSS illustration used when WebGL is unavailable or while the 3D
 * chunk is loading. It deliberately mirrors the hero composition.
 */
export function SceneFallback({ className, loading = false, message }) {
  return (
    <div
      className={cn(
        'relative flex aspect-square w-full max-w-[520px] items-center justify-center overflow-hidden',
        className,
      )}
      aria-label={loading ? 'กำลังโหลดฉาก 3D' : 'ภาพประกอบทดแทนฉาก 3D'}
      role="img"
    >
      <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.22),rgba(124,58,237,0.10)_45%,transparent_70%)] blur-2xl" />

      <div className="relative h-64 w-64 sm:h-72 sm:w-72">
        <div className="absolute inset-0 rounded-full border border-brand-200/70" />
        <div className="absolute inset-6 rounded-full border border-violet-200/60" />
        <div className="absolute inset-12 rounded-full border border-brand-100" />

        <div className="absolute inset-0 animate-[spin_22s_linear_infinite]">
          <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-brand-500 shadow-[0_0_20px_4px_rgba(99,102,241,0.45)]" />
          <span className="absolute bottom-6 right-8 h-2 w-2 rounded-full bg-violet-500" />
        </div>
        <div className="absolute inset-4 animate-[spin_34s_linear_infinite_reverse]">
          <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-sky-400" />
          <span className="absolute right-2 top-1/3 h-2 w-2 rounded-full bg-fuchsia-400" />
        </div>

        <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-brand-gradient shadow-[0_30px_60px_-20px_rgba(79,70,229,0.8)]">
          <div className="absolute inset-1 rounded-[1.8rem] border border-white/25" />
          <Orbit className="h-10 w-10 text-white/90" aria-hidden="true" />
        </div>

        <span className="absolute -right-2 top-10 rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-ink shadow-soft backdrop-blur">
          {loading ? 'กำลังเตรียมฉาก…' : '3D preview'}
        </span>
      </div>

      {message && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-ink-400">
          {message}
        </p>
      )}
    </div>
  )
}
