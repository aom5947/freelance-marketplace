import { getDb, mutate } from './mockDb'
import { clone, delay } from './utils'

export async function getAdminOverview() {
  await delay(240)
  const db = getDb()
  return {
    users: [
      ...db.clients.map((client) => ({
        id: client.id,
        name: client.name,
        contact: client.contactName,
        role: 'client',
        status: client.verified ? 'active' : 'pending',
        joined: client.memberSince,
      })),
      ...db.freelancers.map((freelancer) => ({
        id: freelancer.id,
        name: freelancer.name,
        contact: freelancer.title,
        role: 'freelancer',
        status: 'active',
        joined: freelancer.memberSince,
      })),
    ],
    jobs: db.jobs.map((job) => clone(job)),
    reports: db.adminReports.map((report) => clone(report)),
  }
}

export async function updateUserStatus(id, status) {
  await delay(240)
  return mutate((db) => {
    const client = db.clients.find((entry) => entry.id === id)
    if (client) client.verified = status === 'active'
    return { id, status }
  })
}

export async function resolveReport(id, status) {
  await delay(240)
  return mutate((db) => {
    const report = db.adminReports.find((entry) => entry.id === id)
    if (report) report.status = status
    return { id, status }
  })
}
