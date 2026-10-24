import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function ScrollReveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = 'div',
  once = true,
}) {
  const reduced = useReducedMotion()
  const Component = motion[as] || motion.div

  if (reduced) {
    return <Component className={className}>{children}</Component>
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Component>
  )
}
