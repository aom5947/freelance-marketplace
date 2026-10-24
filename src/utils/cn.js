/** Tiny classnames helper — no dependency needed. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
