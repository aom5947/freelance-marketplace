import { appConfig } from '@/config/appConfig'
import * as mock from '@/services/mocks/mockProjectService'
import { apiClient, assertApiConfigured } from './apiClient'
import { endpoints } from './endpoints'

export const projectService = {
  listProjects(params) {
    if (appConfig.useMockApi) return mock.listProjects(params)
    assertApiConfigured()
    return apiClient.get(endpoints.projects.list, { params }).then((r) => r.data)
  },

  getProject(id) {
    if (appConfig.useMockApi) return mock.getProject(id)
    assertApiConfigured()
    return apiClient.get(endpoints.projects.detail(id)).then((r) => r.data)
  },

  updateProject(id, payload) {
    if (appConfig.useMockApi) return mock.updateProject(id, payload)
    assertApiConfigured()
    return apiClient.patch(endpoints.projects.detail(id), payload).then((r) => r.data)
  },

  submitWork(projectId, payload) {
    if (appConfig.useMockApi) return mock.submitWork(projectId, payload)
    assertApiConfigured()
    return apiClient.post(endpoints.projects.submissions(projectId), payload).then((r) => r.data)
  },

  approveSubmission(projectId) {
    if (appConfig.useMockApi) return mock.approveSubmission(projectId)
    assertApiConfigured()
    return apiClient.post(endpoints.projects.approve(projectId)).then((r) => r.data)
  },

  requestRevision(projectId, feedback) {
    if (appConfig.useMockApi) return mock.requestRevision(projectId, feedback)
    assertApiConfigured()
    return apiClient
      .post(endpoints.projects.requestRevision(projectId), { feedback })
      .then((r) => r.data)
  },
}
