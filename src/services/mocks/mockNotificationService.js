import { getDb, mutate } from './mockDb'
import { clone, delay } from './utils'

export async function listNotifications(audience) {
  await delay(200)
  const db = getDb()
  return db.notifications
    .filter((notification) => notification.audience === audience)
    .map((notification) => clone(notification))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function markNotificationRead(id) {
  await delay(140)
  return mutate((db) => {
    const notification = db.notifications.find((entry) => entry.id === id)
    if (notification) notification.read = true
    return { id }
  })
}

export async function markAllNotificationsRead(audience) {
  await delay(220)
  return mutate((db) => {
    db.notifications.forEach((notification) => {
      if (notification.audience === audience) notification.read = true
    })
    return { audience }
  })
}
