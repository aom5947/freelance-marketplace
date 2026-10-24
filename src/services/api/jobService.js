import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockJobService'
import { apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

/**
 * Job service used by every page. With VITE_USE_MOCK_API=true (default) it reads
 * the local mock database; once the backend is ready, flip the env flag and the
 * UI keeps working unchanged.
 */
export const jobService = {
  listJobs(filters) {
    if (appConfig.useMockApi) return mock.listJobs(filters)
    assertApiConfigured()
    return apiClient.get(endpoints.jobs.list, { params: filters }).then((r) => r.data)
  },

  getJob(id) {
    if (appConfig.useMockApi) return mock.getJob(id)
    assertApiConfigured()
    return apiClient.get(endpoints.jobs.detail(id)).then((r) => r.data)
  },

  listClientJobs(clientId) {
    if (appConfig.useMockApi) return mock.listClientJobs(clientId)
    assertApiConfigured()
    return apiClient.get(endpoints.jobs.clientJobs(clientId)).then((r) => r.data)
  },

  createJob(payload, clientId) {
    if (appConfig.useMockApi) return mock.createJob(payload, clientId)
    assertApiConfigured()
    return apiClient.post(endpoints.jobs.list, { ...payload, clientId }).then((r) => r.data)
  },

  updateJob(id, payload) {
    if (appConfig.useMockApi) return mock.updateJob(id, payload)
    assertApiConfigured()
    return apiClient.patch(endpoints.jobs.detail(id), payload).then((r) => r.data)
  },

  deleteJob(id) {
    if (appConfig.useMockApi) return mock.deleteJob(id)
    assertApiConfigured()
    return apiClient.delete(endpoints.jobs.detail(id)).then((r) => r.data)
  },
}
