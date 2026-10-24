import { appConfig } from '@/config/appConfig'
import { ApiNotConfiguredError, apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

/**
 * Raw HTTP adapter for authentication.
 *
 * ⚠️ The paths come from the DRAFT endpoint map and are NOT confirmed by the
 * backend team. The UI never calls these while VITE_USE_MOCK_API=true.
 */
export const authApi = {
  async fetchCurrentUser(token) {
    assertApiConfigured()
    const { data } = await apiClient.get(endpoints.auth.me, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    return data
  },

  async signOut() {
    assertApiConfigured()
    await apiClient.post(endpoints.auth.logout)
    return true
  },

  /**
   * Returns the URL that should be used for the real Google OAuth redirect once
   * the backend exposes a callback. TODO(auth): confirm the callback contract.
   */
  getGoogleAuthUrl(role) {
    if (!appConfig.apiBaseUrl) throw new ApiNotConfiguredError()
    const url = new URL(endpoints.auth.google, appConfig.apiBaseUrl)
    url.searchParams.set('role', role)
    return url.toString()
  },
}
