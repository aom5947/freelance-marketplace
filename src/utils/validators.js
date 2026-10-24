export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())

export const isUrl = (value) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

/** Small declarative validator used by every form in the app. */
export function validate(values, rules) {
  const errors = {}
  Object.entries(rules).forEach(([field, checks]) => {
    for (const check of checks) {
      const message = check(values[field], values)
      if (message) {
        errors[field] = message
        break
      }
    }
  })
  return errors
}

export const required = (label) => (value) =>
  !value || String(value).trim().length === 0 ? `กรุณากรอก${label}` : null

export const minLength = (length, label) => (value) =>
  value && String(value).trim().length < length ? `${label}ต้องมีอย่างน้อย ${length} ตัวอักษร` : null

export const maxLength = (length, label) => (value) =>
  value && String(value).trim().length > length ? `${label}ต้องไม่เกิน ${length} ตัวอักษร` : null

export const emailFormat = () => (value) => (value && !isEmail(value) ? 'รูปแบบอีเมลไม่ถูกต้อง' : null)

export const numericMin = (min, label) => (value) =>
  value !== '' && value !== undefined && value !== null && Number(value) < min
    ? `${label}ต้องไม่น้อยกว่า ${min}`
    : null

export const positiveNumber = (label) => (value) =>
  value !== '' && value !== undefined && (Number.isNaN(Number(value)) || Number(value) <= 0)
    ? `${label}ต้องเป็นตัวเลขมากกว่า 0`
    : null
