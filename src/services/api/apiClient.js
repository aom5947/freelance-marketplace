import axios from 'axios'
import { appConfig } from '@/config/appConfig'

export const AUTH_TOKEN_KEY = 'freelink.auth.token'

export class ApiNotConfiguredError extends Error {
  constructor(message = 'ยังไม่ได้ตั้งค่า VITE_API_BASE_URL — Frontend ยังไม่เชื่อมต่อ Backend') {
    super(message)
    this.name = 'ApiNotConfiguredError'
    this.code = 'API_NOT_CONFIGURED'
  }
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl || '',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? null
    const payload = error.response?.data
    const message =
      payload?.message ||
      (status ? `คำขอไม่สำเร็จ (HTTP ${status})` : 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    return Promise.reject({
      message,
      status,
      code: payload?.code || error.code || 'NETWORK_ERROR',
      details: payload?.errors || null,
      isApiError: true,
    })
  },
)

/** Call this at the start of every real-API service method. */
export function assertApiConfigured() {
  if (!appConfig.apiBaseUrl) throw new ApiNotConfiguredError()
}

export function persistAuthToken(token) {
  if (typeof window === 'undefined') return
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  else window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function getErrorMessage(error, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') {
  if (!error) return fallback
  return error.message || error.reason || fallback
}
