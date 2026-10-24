import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockMessageService'
import { apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

export const messageService = {
  listThreads(params) {
    if (appConfig.useMockApi) return mock.listThreads(params)
    assertApiConfigured()
    return apiClient.get(endpoints.messages.threads, { params }).then((r) => r.data)
  },

  getThread(params) {
    if (appConfig.useMockApi) return mock.getThread(params)
    assertApiConfigured()
    return apiClient.get(endpoints.messages.thread(params.threadId)).then((r) => r.data)
  },

  send(params) {
    if (appConfig.useMockApi) return mock.sendMessage(params)
    assertApiConfigured()
    return apiClient
      .post(endpoints.messages.send(params.threadId), { text: params.text })
      .then((r) => r.data)
  },

  markRead(params) {
    if (appConfig.useMockApi) return mock.markThreadRead(params)
    assertApiConfigured()
    return apiClient.patch(`${endpoints.messages.thread(params.threadId)}/read`).then((r) => r.data)
  },
}
