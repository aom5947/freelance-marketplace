import { appConfig } from '@/config/appConfig'
import { normalizeWalletError } from './errors'

export const TX_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REJECTED: 'rejected',
}

/**
 * Runs a contract write and reports the REAL lifecycle. No state is reported as
 * confirmed without an actual receipt from the network.
 */
export async function executeTransaction(send, { onStatus } = {}) {
  try {
    onStatus?.({ status: TX_STATUS.PENDING, hash: null })
    const tx = await send()
    onStatus?.({ status: TX_STATUS.PENDING, hash: tx.hash })
    const receipt = await tx.wait()
    if (!receipt || receipt.status === 0) {
      onStatus?.({ status: TX_STATUS.FAILED, hash: tx.hash, error: 'ธุรกรรมถูก revert' })
      return { status: TX_STATUS.FAILED, hash: tx.hash, receipt }
    }
    onStatus?.({
      status: TX_STATUS.CONFIRMED,
      hash: receipt.hash || tx.hash,
      blockNumber: receipt.blockNumber,
    })
    return { status: TX_STATUS.CONFIRMED, hash: receipt.hash || tx.hash, receipt }
  } catch (error) {
    const normalized = normalizeWalletError(error)
    const status = normalized.code === 'USER_REJECTED' ? TX_STATUS.REJECTED : TX_STATUS.FAILED
    onStatus?.({ status, hash: null, error: normalized.message })
    return { status, error: normalized.message }
  }
}

export function getExplorerTxUrl(hash) {
  if (!hash || !appConfig.explorerUrl) return null
  return `${appConfig.explorerUrl.replace(/\/$/, '')}/tx/${hash}`
}

export function getExplorerAddressUrl(address) {
  if (!address || !appConfig.explorerUrl) return null
  return `${appConfig.explorerUrl.replace(/\/$/, '')}/address/${address}`
}
