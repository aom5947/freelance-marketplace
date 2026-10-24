/**
 * DRAFT endpoint map.
 *
 * ⚠️ NONE of these paths are confirmed by the backend team yet. They are
 * placeholders so that the Axios-based services have a single place to update.
 * Replace them with the real API documentation and set VITE_USE_MOCK_API=false
 * only after the endpoints respond.
 */
export const endpoints = {
  auth: {
    me: '/auth/me',
    google: '/auth/google',
    logout: '/auth/logout',
  },
  jobs: {
    list: '/jobs',
    detail: (id) => `/jobs/${id}`,
    clientJobs: (clientId) => `/clients/${clientId}/jobs`,
  },
  proposals: {
    byJob: (jobId) => `/jobs/${jobId}/proposals`,
    byFreelancer: (freelancerId) => `/freelancers/${freelancerId}/proposals`,
    detail: (id) => `/proposals/${id}`,
    hire: (id) => `/proposals/${id}/hire`,
  },
  projects: {
    list: '/projects',
    detail: (id) => `/projects/${id}`,
    submissions: (id) => `/projects/${id}/submissions`,
    approve: (id) => `/projects/${id}/approve`,
    requestRevision: (id) => `/projects/${id}/request-revision`,
  },
  profiles: {
    freelancers: '/freelancers',
    freelancer: (id) => `/freelancers/${id}`,
    client: (id) => `/clients/${id}`,
    reviews: (freelancerId) => `/freelancers/${freelancerId}/reviews`,
  },
  notifications: {
    list: '/notifications',
    read: (id) => `/notifications/${id}/read`,
    readAll: '/notifications/read-all',
  },
  transactions: {
    list: '/transactions',
    detail: (id) => `/transactions/${id}`,
    withdraw: '/transactions/withdraw',
  },
  messages: {
    threads: '/messages/threads',
    thread: (id) => `/messages/threads/${id}`,
    send: (id) => `/messages/threads/${id}/messages`,
  },
}
