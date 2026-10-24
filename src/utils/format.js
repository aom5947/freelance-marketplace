import { appConfig } from '@/config/appConfig'

export function formatCurrency(amount, { compact = false, showSymbol = true } = {}) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—'
  const value = Number(amount)
  const formatter = new Intl.NumberFormat(appConfig.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: appConfig.currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact && Math.abs(value) >= 10000 ? 'compact' : 'standard',
  })
  return formatter.format(value)
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat(appConfig.locale).format(Number(value))
}

export function formatDate(value, options = {}) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(appConfig.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(value))
}

export function timeAgo(value) {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} วันที่แล้ว`
  return formatDate(value, { year: undefined })
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

export function truncate(text = '', length = 140) {
  if (text.length <= length) return text
  return `${text.slice(0, length).trimEnd()}…`
}

export function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
