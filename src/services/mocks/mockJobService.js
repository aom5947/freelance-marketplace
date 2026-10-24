import { getDb, mutate } from './mockDb'
import { clone, delay, findOrThrow, uid } from './utils'

function enrich(db, job) {
  const client = db.clients.find((entry) => entry.id === job.clientId)
  return { ...clone(job), client: client ? clone(client) : null }
}

function matches(job, client, filters) {
  const {
    q = '',
    category = '',
    budgetType = '',
    minBudget,
    maxBudget,
    status,
    clientId,
    featured,
  } = filters
  const term = q.trim().toLowerCase()
  const searchable = [job.title, job.description, ...(job.skills || []), client?.name || '']
    .join(' ')
    .toLowerCase()

  if (status && job.status !== status) return false
  if (clientId && job.clientId !== clientId) return false
  if (featured && !job.featured) return false
  if (category && job.category !== category) return false
  if (budgetType && job.budgetType !== budgetType) return false
  if (minBudget !== undefined && minBudget !== '' && Number(job.budgetMin) < Number(minBudget)) return false
  if (maxBudget !== undefined && maxBudget !== '' && Number(job.budgetMax) > Number(maxBudget)) return false
  if (term && !searchable.includes(term)) return false
  return true
}

const sorters = {
  recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  budget_desc: (a, b) => b.budgetMax - a.budgetMax,
  budget_asc: (a, b) => a.budgetMin - b.budgetMin,
  proposals: (a, b) => b.proposalsCount - a.proposalsCount,
}

export async function listJobs(filters = {}) {
  await delay()
  const db = getDb()
  const items = db.jobs
    .map((job) => enrich(db, job))
    .filter((job) => matches(job, job.client, filters))
    .sort(sorters[filters.sort] || sorters.recent)
  return items
}

export async function getJob(id) {
  await delay(180)
  const db = getDb()
  const job = findOrThrow(db.jobs, id, 'ประกาศงาน')
  return enrich(db, job)
}

export async function listClientJobs(clientId) {
  await delay()
  const db = getDb()
  return db.jobs
    .filter((job) => job.clientId === clientId)
    .map((job) => enrich(db, job))
    .sort(sorters.recent)
}

export async function createJob(payload, clientId) {
  await delay(400)
  const job = {
    id: uid('j'),
    clientId,
    title: payload.title,
    category: payload.category,
    description: payload.description,
    skills: payload.skills || [],
    budgetMin: Number(payload.budgetMin),
    budgetMax: Number(payload.budgetMax),
    budgetType: payload.budgetType,
    duration: payload.duration,
    experience: payload.experience,
    deadline: payload.deadline || null,
    proposalsCount: 0,
    status: payload.status || 'open',
    featured: false,
    escrowProtected: true,
    createdAt: new Date().toISOString(),
    deliverables: payload.deliverables || [],
  }
  mutate((db) => {
    db.jobs.unshift(job)
  })
  return clone(job)
}

export async function updateJob(id, payload) {
  await delay(320)
  const updated = mutate((db) => {
    const job = findOrThrow(db.jobs, id, 'ประกาศงาน')
    Object.assign(job, payload)
    return clone(job)
  })
  return updated
}

export async function deleteJob(id) {
  await delay(260)
  mutate((db) => {
    const index = db.jobs.findIndex((job) => job.id === id)
    if (index === -1) throw new Error('ไม่พบประกาศงานที่ต้องการลบ')
    db.jobs.splice(index, 1)
    db.proposals = db.proposals.filter((proposal) => proposal.jobId !== id)
  })
  return { id }
}
