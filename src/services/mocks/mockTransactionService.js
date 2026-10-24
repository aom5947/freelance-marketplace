import { getDb, mutate } from './mockDb'
import { clone, delay, findOrThrow, uid } from './utils'

export async function listTransactions(userId) {
  await delay(200)
  const db = getDb()
  return db.transactions
    .filter((transaction) => !userId || transaction.userId === userId)
    .map((transaction) => clone(transaction))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getTransaction(id) {
  await delay(160)
  const db = getDb()
  return clone(findOrThrow(db.transactions, id, 'ธุรกรรม'))
}

export async function requestWithdrawal(userId, amount) {
  await delay(380)
  return mutate((db) => {
    const transaction = {
      id: uid('t'),
      projectId: null,
      userId,
      type: 'withdrawal',
      amount: Number(amount),
      status: 'pending',
      hash: null,
      isMock: true,
      createdAt: new Date().toISOString(),
      note: 'คำขอถอนเงิน (ข้อมูลจำลอง) — รอการอนุมัติ',
    }
    db.transactions.unshift(transaction)
    return clone(transaction)
  })
}
