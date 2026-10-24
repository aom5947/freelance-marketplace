import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockAdminService'
import { apiClient, assertApiConfigured } from './apiClient'

/**
 * Admin UI is a demonstration only — no admin backend exists in this project.
 * Real endpoint paths must be agreed with the backend team before enabling.
 */
export const adminService = {
  getOverview() {
    if (appConfig.useMockApi) return mock.getAdminOverview()
    assertApiConfigured()
    return apiClient.get('/admin/overview').then((r) => r.data) // TODO(api): confirm path
  },

  updateUserStatus(id, status) {
    if (appConfig.useMockApi) return mock.updateUserStatus(id, status)
    assertApiConfigured()
    return apiClient.patch(`/admin/users/${id}`, { status }).then((r) => r.data) // TODO(api)
  },

  resolveReport(id, status) {
    if (appConfig.useMockApi) return mock.resolveReport(id, status)
    assertApiConfigured()
    return apiClient.patch(`/admin/reports/${id}`, { status }).then((r) => r.data) // TODO(api)
  },
}
