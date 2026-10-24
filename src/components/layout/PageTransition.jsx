import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function PageTransition({ children, className }) {
  const location = useLocation()
  const reduced = useReducedMotion()

  return (
    <motion.div
      key={location.pathname}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
