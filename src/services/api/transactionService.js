import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockTransactionService'
import { apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

export const transactionService = {
  list(userId) {
    if (appConfig.useMockApi) return mock.listTransactions(userId)
    assertApiConfigured()
    return apiClient.get(endpoints.transactions.list, { params: { userId } }).then((r) => r.data)
  },

  getById(id) {
    if (appConfig.useMockApi) return mock.getTransaction(id)
    assertApiConfigured()
    return apiClient.get(endpoints.transactions.detail(id)).then((r) => r.data)
  },

  requestWithdrawal(userId, amount) {
    if (appConfig.useMockApi) return mock.requestWithdrawal(userId, amount)
    assertApiConfigured()
    return apiClient
      .post(endpoints.transactions.withdraw, { userId, amount })
      .then((r) => r.data)
  },
}
