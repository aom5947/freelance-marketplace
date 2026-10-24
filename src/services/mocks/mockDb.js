import {
  adminReports,
  clients,
  freelancers,
  jobs,
  notifications,
  projects,
  proposals,
  reviews,
  threads,
  transactions,
} from '@/data/mockData'
import { clone } from './utils'

const STORAGE_KEY = 'freelink.mockdb.v1'

function createSeed() {
  return {
    clients: clone(clients),
    freelancers: clone(freelancers),
    jobs: clone(jobs),
    proposals: clone(proposals),
    projects: clone(projects),
    reviews: clone(reviews),
    notifications: clone(notifications),
    transactions: clone(transactions),
    threads: clone(threads),
    adminReports: clone(adminReports),
  }
}

let cache = null

function readStorage() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const required = ['clients', 'freelancers', 'jobs', 'proposals', 'projects']
    return required.every((key) => Array.isArray(parsed[key])) ? parsed : null
  } catch {
    return null
  }
}

export function getDb() {
  if (cache) return cache
  cache = readStorage() || createSeed()
  return cache
}

export function saveDb(db = cache) {
  cache = db
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      // Modifications stay in memory when storage is unavailable/full.
    }
  }
  return db
}

/** Mutate the db in place, persist it, and return whatever the mutator returns. */
export function mutate(mutator) {
  const db = getDb()
  const result = mutator(db)
  saveDb(db)
  return result
}

export function resetDb() {
  cache = createSeed()
  saveDb(cache)
  return cache
}

export { STORAGE_KEY }
