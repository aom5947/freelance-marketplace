import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockProposalService'
import { apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

export const proposalService = {
  listByJob(jobId) {
    if (appConfig.useMockApi) return mock.listProposalsByJob(jobId)
    assertApiConfigured()
    return apiClient.get(endpoints.proposals.byJob(jobId)).then((r) => r.data)
  },

  listByFreelancer(freelancerId) {
    if (appConfig.useMockApi) return mock.listProposalsByFreelancer(freelancerId)
    assertApiConfigured()
    return apiClient.get(endpoints.proposals.byFreelancer(freelancerId)).then((r) => r.data)
  },

  getProposal(id) {
    if (appConfig.useMockApi) return mock.getProposal(id)
    assertApiConfigured()
    return apiClient.get(endpoints.proposals.detail(id)).then((r) => r.data)
  },

  createProposal(payload) {
    if (appConfig.useMockApi) return mock.createProposal(payload)
    assertApiConfigured()
    return apiClient.post(endpoints.proposals.byJob(payload.jobId), payload).then((r) => r.data)
  },

  updateStatus(id, status) {
    if (appConfig.useMockApi) return mock.updateProposalStatus(id, status)
    assertApiConfigured()
    return apiClient.patch(endpoints.proposals.detail(id), { status }).then((r) => r.data)
  },

  withdraw(id) {
    if (appConfig.useMockApi) return mock.withdrawProposal(id)
    assertApiConfigured()
    return apiClient.post(`${endpoints.proposals.detail(id)}/withdraw`).then((r) => r.data)
  },

  hire(id) {
    if (appConfig.useMockApi) return mock.hireProposal(id)
    assertApiConfigured()
    return apiClient.post(endpoints.proposals.hire(id)).then((r) => r.data)
  },
}
