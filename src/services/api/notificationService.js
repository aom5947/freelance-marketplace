import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockNotificationService'
import { apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

export const notificationService = {
  list(audience) {
    if (appConfig.useMockApi) return mock.listNotifications(audience)
    assertApiConfigured()
    return apiClient.get(endpoints.notifications.list, { params: { audience } }).then((r) => r.data)
  },

  markRead(id) {
    if (appConfig.useMockApi) return mock.markNotificationRead(id)
    assertApiConfigured()
    return apiClient.patch(endpoints.notifications.read(id)).then((r) => r.data)
  },

  markAllRead(audience) {
    if (appConfig.useMockApi) return mock.markAllNotificationsRead(audience)
    assertApiConfigured()
    return apiClient.patch(endpoints.notifications.readAll, { audience }).then((r) => r.data)
  },
}
