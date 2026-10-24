import { getDb, mutate } from './mockDb'
import { clone, delay, findOrThrow, uid } from './utils'

function enrich(db, thread, role) {
  const client = db.clients.find((entry) => entry.id === thread.clientId)
  const freelancer = db.freelancers.find((entry) => entry.id === thread.freelancerId)
  const other = role === 'client' ? freelancer : client
  return {
    ...clone(thread),
    client: clone(client || null),
    freelancer: clone(freelancer || null),
    other: clone(other || null),
    project: clone(db.projects.find((project) => project.id === thread.projectId) || null),
    lastMessage: thread.messages[thread.messages.length - 1] || null,
    unread: (thread.unreadFor || []).includes(role),
  }
}

export async function listThreads({ role, profileId }) {
  await delay(220)
  const db = getDb()
  return db.threads
    .filter((thread) =>
      role === 'client' ? thread.clientId === profileId : thread.freelancerId === profileId,
    )
    .map((thread) => enrich(db, thread, role))
    .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0))
}

export async function getThread({ threadId, role }) {
  await delay(160)
  const db = getDb()
  return enrich(db, findOrThrow(db.threads, threadId, 'บทสนทนา'), role)
}

export async function sendMessage({ threadId, role, text }) {
  await delay(220)
  return mutate((db) => {
    const thread = findOrThrow(db.threads, threadId, 'บทสนทนา')
    const message = {
      id: uid('ms'),
      senderRole: role,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    thread.messages.push(message)
    thread.unreadFor = role === 'client' ? ['freelancer'] : ['client']
    return { thread: enrich(db, thread, role), message: clone(message) }
  })
}

export async function markThreadRead({ threadId, role }) {
  await delay(100)
  return mutate((db) => {
    const thread = db.threads.find((entry) => entry.id === threadId)
    if (thread) thread.unreadFor = (thread.unreadFor || []).filter((entry) => entry !== role)
    return { threadId }
  })
}
