import { getDb, mutate } from './mockDb'
import { clone, delay, findOrThrow, uid } from './utils'

function enrich(db, proposal) {
  const freelancer = db.freelancers.find((entry) => entry.id === proposal.freelancerId)
  const job = db.jobs.find((entry) => entry.id === proposal.jobId)
  return {
    ...clone(proposal),
    freelancer: freelancer ? clone(freelancer) : null,
    job: job ? clone(job) : null,
  }
}

export async function listProposalsByJob(jobId) {
  await delay()
  const db = getDb()
  return db.proposals
    .filter((proposal) => proposal.jobId === jobId)
    .map((proposal) => enrich(db, proposal))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function listProposalsByFreelancer(freelancerId) {
  await delay()
  const db = getDb()
  return db.proposals
    .filter((proposal) => proposal.freelancerId === freelancerId)
    .map((proposal) => enrich(db, proposal))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getProposal(id) {
  await delay(180)
  const db = getDb()
  return enrich(db, findOrThrow(db.proposals, id, 'ข้อเสนอ'))
}

export async function createProposal(payload) {
  await delay(420)
  const proposal = {
    id: uid('p'),
    jobId: payload.jobId,
    freelancerId: payload.freelancerId,
    bidAmount: Number(payload.bidAmount),
    deliveryDays: Number(payload.deliveryDays),
    coverLetter: payload.coverLetter,
    status: 'pending',
    createdAt: new Date().toISOString(),
    attachments: payload.attachments || [],
  }
  mutate((db) => {
    const job = findOrThrow(db.jobs, payload.jobId, 'ประกาศงาน')
    if (job.status !== 'open') throw new Error('ประกาศงานนี้ปิดรับข้อเสนอแล้ว')
    const duplicate = db.proposals.find(
      (item) =>
        item.jobId === payload.jobId &&
        item.freelancerId === payload.freelancerId &&
        ['pending', 'shortlisted', 'hired'].includes(item.status),
    )
    if (duplicate) throw new Error('คุณส่งข้อเสนอสำหรับงานนี้แล้ว')
    db.proposals.unshift(proposal)
    job.proposalsCount += 1
  })
  return clone(proposal)
}

export async function updateProposalStatus(id, status) {
  await delay(260)
  const updated = mutate((db) => {
    const proposal = findOrThrow(db.proposals, id, 'ข้อเสนอ')
    proposal.status = status
    return clone(proposal)
  })
  return updated
}

export async function withdrawProposal(id) {
  return updateProposalStatus(id, 'withdrawn')
}

/**
 * Hire a freelancer: marks one proposal hired, rejects the rest and creates a
 * project with escrow NOT funded. Funding must go through the contract service.
 */
export async function hireProposal(proposalId) {
  await delay(480)
  const result = mutate((db) => {
    const proposal = findOrThrow(db.proposals, proposalId, 'ข้อเสนอ')
    const job = findOrThrow(db.jobs, proposal.jobId, 'ประกาศงาน')
    if (!['pending', 'shortlisted'].includes(proposal.status)) {
      throw new Error('ข้อเสนอนี้ไม่สามารถจ้างได้ในสถานะปัจจุบัน')
    }

    proposal.status = 'hired'
    db.proposals.forEach((item) => {
      if (item.jobId === proposal.jobId && item.id !== proposal.id && item.status !== 'withdrawn') {
        item.status = 'rejected'
      }
    })
    job.status = 'in_progress'

    const project = {
      id: uid('pr'),
      jobId: job.id,
      clientId: job.clientId,
      freelancerId: proposal.freelancerId,
      title: job.title,
      status: 'active',
      budget: proposal.bidAmount,
      progress: 0,
      escrowStatus: 'unfunded',
      escrowAmount: 0,
      releasedAmount: 0,
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + proposal.deliveryDays * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      milestones: [
        {
          id: uid('m'),
          title: 'ส่งมอบงาน',
          amount: proposal.bidAmount,
          status: 'in_progress',
          dueDate: new Date(Date.now() + proposal.deliveryDays * 86400000).toISOString(),
        },
      ],
      submissions: [],
    }
    db.projects.unshift(project)

    db.notifications.unshift({
      id: uid('n'),
      audience: 'freelancer',
      type: 'proposal',
      title: 'คุณได้รับงานใหม่',
      body: `${job.title} — กรุณารอลูกค้าฝากเงินเข้า escrow ก่อนเริ่มงาน`,
      createdAt: new Date().toISOString(),
      read: false,
      link: `/freelancer/projects/${project.id}`,
    })

    return { project: clone(project), job: clone(job) }
  })
  return result
}
