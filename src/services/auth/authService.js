import { appConfig } from '@/config/appConfig'
import { signInMock, signInWithGoogleMock } from '@/services/mocks/mockAuthService'
import { ApiNotConfiguredError, persistAuthToken } from '@/services/api/apiClient'
import { authApi } from '@/services/api/authService'

export const SESSION_KEY = 'freelink.auth.session'

export class AuthNotConfiguredError extends Error {
  constructor(message = 'ยังไม่ได้เชื่อมต่อระบบ Authentication จริง — ขณะนี้ใช้ Mock Login สำหรับทดสอบ') {
    super(message)
    this.name = 'AuthNotConfiguredError'
    this.code = 'AUTH_NOT_CONFIGURED'
  }
}

/**
 * Unified auth entry point.
 * Mock mode: returns a demo session for the selected role.
 * Real mode: must be replaced with the OAuth/Firebase flow agreed with the team.
 */
export const authService = {
  async signInWithRole(role, profile = {}) {
    if (appConfig.useMockApi) {
      const session = await signInMock(role, profile)
      return session
    }
    throw new AuthNotConfiguredError()
  },

  async signInWithGoogle(role) {
    if (appConfig.useMockApi) {
      const session = await signInWithGoogleMock(role)
      return session
    }
    // TODO(auth): redirect to the backend OAuth endpoint and handle the callback.
    // Do not fake a session when no provider is configured.
    if (!appConfig.apiBaseUrl) throw new ApiNotConfiguredError()
    throw new AuthNotConfiguredError(
      'ยังไม่ได้เชื่อมต่อ OAuth callback — ต้องใช้ authApi.getGoogleAuthUrl(role) หลัง Backend พร้อม',
    )
  },

  async fetchCurrentUser(token) {
    if (appConfig.useMockApi) return null
    return authApi.fetchCurrentUser(token)
  },

  async signOut() {
    persistAuthToken(null)
    if (!appConfig.useMockApi && appConfig.apiBaseUrl) {
      try {
        await authApi.signOut()
      } catch {
        // Logging out locally must never be blocked by a network error.
      }
    }
    return true
  },

  loadSession() {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const session = JSON.parse(raw)
      return session?.user?.role ? session : null
    } catch {
      return null
    }
  },

  saveSession(session) {
    if (typeof window === 'undefined') return
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      persistAuthToken(session.token)
    } else {
      window.localStorage.removeItem(SESSION_KEY)
      persistAuthToken(null)
    }
  },
}
