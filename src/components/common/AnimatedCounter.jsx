import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

export function AnimatedCounter({
  value = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.5,
  className,
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  useEffect(() => {
    if (!inView) return undefined
    if (reduced) {
      setDisplay(value)
      return undefined
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
  }, [inView, value, duration, reduced])

  const formatted =
    decimals > 0
      ? Number(display).toFixed(decimals)
      : formatNumber(Math.round(display))

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
