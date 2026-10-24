import { getDb, mutate } from './mockDb'
import { clone, delay, findOrThrow, uid } from './utils'

function enrich(db, project) {
  return {
    ...clone(project),
    client: clone(db.clients.find((entry) => entry.id === project.clientId) || null),
    freelancer: clone(db.freelancers.find((entry) => entry.id === project.freelancerId) || null),
    job: clone(db.jobs.find((entry) => entry.id === project.jobId) || null),
  }
}

export async function listProjects({ role, profileId } = {}) {
  await delay()
  const db = getDb()
  return db.projects
    .filter((project) => {
      if (role === 'client') return project.clientId === profileId
      if (role === 'freelancer') return project.freelancerId === profileId
      return true
    })
    .map((project) => enrich(db, project))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getProject(id) {
  await delay(200)
  const db = getDb()
  return enrich(db, findOrThrow(db.projects, id, 'โครงการ'))
}

export async function updateProject(id, payload) {
  await delay(260)
  return mutate((db) => {
    const project = findOrThrow(db.projects, id, 'โครงการ')
    Object.assign(project, payload)
    return enrich(db, project)
  })
}

export async function submitWork(projectId, payload) {
  await delay(420)
  return mutate((db) => {
    const project = findOrThrow(db.projects, projectId, 'โครงการ')
    const submission = {
      id: uid('s'),
      title: payload.title,
      description: payload.description,
      link: payload.link || '',
      files: payload.files || [],
      submittedAt: new Date().toISOString(),
      status: 'pending',
      feedback: '',
    }
    project.submissions.unshift(submission)
    project.status = 'in_review'
    project.progress = 100
    db.notifications.unshift({
      id: uid('n'),
      audience: 'client',
      type: 'submission',
      title: 'มีงานส่งตรวจรับ',
      body: `${project.title} — ${payload.title}`,
      createdAt: new Date().toISOString(),
      read: false,
      link: `/client/projects/${project.id}/review`,
    })
    return { project: enrich(db, project), submission: clone(submission) }
  })
}

export async function requestRevision(projectId, feedback) {
  await delay(320)
  return mutate((db) => {
    const project = findOrThrow(db.projects, projectId, 'โครงการ')
    const latest = project.submissions[0]
    if (latest) {
      latest.status = 'revision'
      latest.feedback = feedback
    }
    project.status = 'revision'
    project.progress = 85
    return enrich(db, project)
  })
}

/**
 * Approves the submitted work and records the payment as MOCK data.
 * This does NOT move real money: the blockchain release must be executed by the
 * contract service once the contract is configured.
 */
export async function approveSubmission(projectId) {
  await delay(480)
  return mutate((db) => {
    const project = findOrThrow(db.projects, projectId, 'โครงการ')
    const latest = project.submissions[0]
    if (latest) latest.status = 'approved'
    project.status = 'completed'
    project.progress = 100
    project.escrowStatus = 'released'
    project.releasedAmount = project.budget
    project.completedAt = new Date().toISOString()

    const now = new Date().toISOString()
    db.transactions.unshift(
      {
        id: uid('t'),
        projectId: project.id,
        userId: 'u-client',
        type: 'release',
        amount: project.budget,
        status: 'confirmed',
        hash: null,
        isMock: true,
        createdAt: now,
        note: `อนุมัติจ่ายเงิน (ข้อมูลจำลอง) — ${project.title}`,
      },
      {
        id: uid('t'),
        projectId: project.id,
        userId: 'u-freelancer',
        type: 'earning',
        amount: project.budget,
        status: 'confirmed',
        hash: null,
        isMock: true,
        createdAt: now,
        note: `รายได้จากโครงการ ${project.title} (ข้อมูลจำลอง)`,
      },
    )

    db.notifications.unshift({
      id: uid('n'),
      audience: 'freelancer',
      type: 'payment',
      title: 'งานได้รับการอนุมัติ',
      body: `${project.title} — ลูกค้าอนุมัติงานแล้ว (บันทึกเป็นข้อมูลจำลอง)`,
      createdAt: now,
      read: false,
      link: `/freelancer/projects/${project.id}`,
    })

    return enrich(db, project)
  })
}

export async function listReviewsForFreelancer(freelancerId) {
  await delay(220)
  const db = getDb()
  return db.reviews
    .filter((review) => review.freelancerId === freelancerId)
    .map((review) => ({
      ...clone(review),
      client: clone(db.clients.find((client) => client.id === review.clientId) || null),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
