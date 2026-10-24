import { getDb, mutate } from './mockDb'
import { clone, delay, findOrThrow } from './utils'

function enrichFreelancer(db, freelancer) {
  // Platform-level rating/count stay from the profile seed; individual reviews are
  // attached on the public profile page. New mock reviews are listed there too.
  return clone(freelancer)
}

export async function listFreelancers(filters = {}) {
  await delay()
  const db = getDb()
  const term = (filters.q || '').trim().toLowerCase()
  const skill = (filters.skill || '').toLowerCase()
  return db.freelancers
    .map((freelancer) => enrichFreelancer(db, freelancer))
    .filter((freelancer) => {
      if (filters.availability && freelancer.availability !== filters.availability) return false
      if (skill && !freelancer.skills.some((item) => item.toLowerCase() === skill)) return false
      if (!term) return true
      return [freelancer.name, freelancer.title, freelancer.bio, ...freelancer.skills]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
    .sort((a, b) => b.rating - a.rating)
}

export async function getFreelancer(id) {
  await delay(200)
  const db = getDb()
  const freelancer = enrichFreelancer(db, findOrThrow(db.freelancers, id, 'โปรไฟล์ฟรีแลนซ์'))
  const own = db.reviews
    .filter((review) => review.freelancerId === id)
    .map((review) => ({
      ...clone(review),
      client: clone(db.clients.find((client) => client.id === review.clientId) || null),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return { ...freelancer, reviews: own }
}

export async function updateFreelancer(id, payload) {
  await delay(360)
  return mutate((db) => {
    const freelancer = findOrThrow(db.freelancers, id, 'โปรไฟล์ฟรีแลนซ์')
    Object.assign(freelancer, payload)
    return enrichFreelancer(db, freelancer)
  })
}

export async function getClient(id) {
  await delay(180)
  const db = getDb()
  return clone(findOrThrow(db.clients, id, 'โปรไฟล์ลูกค้า'))
}

export async function updateClient(id, payload) {
  await delay(360)
  return mutate((db) => {
    const client = findOrThrow(db.clients, id, 'โปรไฟล์ลูกค้า')
    Object.assign(client, payload)
    return clone(client)
  })
}

export async function listReviewsForFreelancer(freelancerId) {
  await delay(200)
  const db = getDb()
  return db.reviews
    .filter((review) => review.freelancerId === freelancerId)
    .map((review) => ({
      ...clone(review),
      client: clone(db.clients.find((client) => client.id === review.clientId) || null),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function addReview(payload) {
  await delay(320)
  return mutate((db) => {
    const review = {
      id: `r-${Date.now()}`,
      freelancerId: payload.freelancerId,
      clientId: payload.clientId,
      projectId: payload.projectId || null,
      rating: Number(payload.rating),
      comment: payload.comment,
      createdAt: new Date().toISOString(),
      criteria: { quality: payload.rating, communication: payload.rating, deadline: payload.rating },
    }
    db.reviews.unshift(review)
    return clone(review)
  })
}
