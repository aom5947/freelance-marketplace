export const MOCK_DELAY = 280

export const delay = (ms = MOCK_DELAY) => new Promise((resolve) => setTimeout(resolve, ms))

export const clone = (value) => JSON.parse(JSON.stringify(value))

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export class MockNotFoundError extends Error {
  constructor(message = 'ไม่พบข้อมูลที่ต้องการ') {
    super(message)
    this.name = 'MockNotFoundError'
    this.code = 'NOT_FOUND'
  }
}

export function findOrThrow(list, id, label = 'ข้อมูล') {
  const item = list.find((entry) => entry.id === id)
  if (!item) throw new MockNotFoundError(`ไม่พบ${label}ที่ระบุ`)
  return item
}
