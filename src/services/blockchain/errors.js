import { Interface } from 'ethers'
import { contractConfig } from '@/config/contractConfig'

export class WalletError extends Error {
  constructor(message, code = 'WALLET_ERROR') {
    super(message)
    this.name = 'WalletError'
    this.code = code
  }
}

export class ContractNotConfiguredError extends Error {
  constructor(missing = [], message) {
    super(
      message ||
        'ยังไม่ได้เชื่อมต่อ Smart Contract — ต้องได้รับ ABI, Contract Address และ Chain ID จากทีมก่อน',
    )
    this.name = 'ContractNotConfiguredError'
    this.code = 'CONTRACT_NOT_CONFIGURED'
    this.missing = missing
  }
}

/** Revert reasons of FreelinkEscrow v2 (BACKEND_START_ver_0_2.md, section 8.4). */
const CONTRACT_ERROR_MESSAGES = {
  NotAuthorized: 'คุณไม่มีสิทธิ์ทำรายการนี้',
  InvalidStatus: 'สถานะปัจจุบันยังทำรายการนี้ไม่ได้',
  InvalidAmount: 'ยอดเงินไม่ถูกต้อง',
  InvalidAddress: 'address ไม่ถูกต้อง (ห้ามเป็น address ว่าง หรือเป็นของผู้ฝากเอง)',
  InvalidDeadline: 'กำหนดส่งงานไม่ถูกต้อง (ต้องอยู่ในอนาคตและไม่เกิน 1 ปี)',
  InvalidDuration: 'ระยะเวลาไม่ถูกต้อง',
  InvalidTerms: 'ข้อตกลงไม่ตรงกับที่ลูกค้าระบุ',
  InvalidShare: 'สัดส่วนการแบ่งเงินไม่ถูกต้อง',
  InvalidLimit: 'ค่าจำกัดไม่ถูกต้อง',
  AlreadyExists: 'โปรเจกต์นี้เคยฝากเงินแล้ว',
  WrongPayment: 'ยอดที่แนบไม่ตรง (ค่าธรรมเนียมอาจเพิ่งเปลี่ยน) ลองใหม่อีกครั้ง',
  NotYetRefundable: 'ยังขอเงินคืนไม่ได้ ต้องรอให้เลยกำหนดส่งงานก่อน',
  DeadlinePassed: 'เลยกำหนดเวลาแล้ว',
  ReviewPeriodActive: 'ยังอยู่ในช่วงตรวจรับของลูกค้า',
  ReviewPeriodOver: 'พ้นช่วงตรวจรับแล้ว',
  RevisionLimitReached: 'ขอแก้ครบจำนวนครั้งแล้ว เหลือปล่อยเงินหรือเปิดข้อพิพาท',
  DisputeRequired: 'เคยส่งงานแล้ว ต้องเปิดข้อพิพาทแทนการขอเงินคืน',
  DisputeNotExpired: 'ผู้ตัดสินยังมีเวลา ยังสั่งแบ่งครึ่งอัตโนมัติไม่ได้',
  ConflictOfInterest: 'ผู้ตัดสินเป็นคู่กรณีในโปรเจกต์นี้ ทำรายการไม่ได้',
  FeeTooHigh: 'ค่าธรรมเนียมสูงเกินเพดาน',
  TransferFailed: 'โอนเงินไม่สำเร็จ',
  OwnableUnauthorizedAccount: 'เฉพาะเจ้าของ contract เท่านั้นที่ทำรายการนี้ได้',
  ReentrancyGuardReentrantCall: 'ธุรกรรมซ้อนกัน ลองใหม่อีกครั้ง',
}

let cachedInterface = null
function getInterface() {
  if (!cachedInterface && Array.isArray(contractConfig.abi) && contractConfig.abi.length > 0) {
    cachedInterface = new Interface(contractConfig.abi)
  }
  return cachedInterface
}

/** Finds the revert data (hex) wherever ethers / the wallet put it. */
function extractRevertData(error) {
  const candidates = [
    error?.data,
    error?.info?.error?.data,
    error?.error?.data,
    error?.info?.error?.data?.data,
    error?.error?.data?.data,
  ]
  return candidates.find((value) => typeof value === 'string' && value.startsWith('0x') && value.length >= 10) || null
}

/**
 * Returns the custom-error name (e.g. "RevisionLimitReached") if the error is a
 * revert of this contract, otherwise null. `error.revert` is filled by ethers
 * when it could decode the data itself.
 */
export function getContractErrorName(error) {
  if (error?.revert?.name) return error.revert.name
  const data = extractRevertData(error)
  const iface = getInterface()
  if (!data || !iface) return null
  try {
    return iface.parseError(data)?.name ?? null
  } catch {
    return null
  }
}

export function normalizeWalletError(error) {
  if (!error) return { code: 'UNKNOWN', message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ' }
  if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.info?.error?.code === 4001) {
    return { code: 'USER_REJECTED', message: 'คุณปฏิเสธคำขอใน Wallet' }
  }
  if (error.code === 'NO_PROVIDER') {
    return { code: 'NO_PROVIDER', message: 'ไม่พบ Wallet ในเบราว์เซอร์นี้' }
  }
  if (error.code === 'CONTRACT_NOT_CONFIGURED') {
    return { code: error.code, message: error.message, missing: error.missing }
  }
  if (error.code === 'WRONG_NETWORK') {
    return { code: error.code, message: error.message }
  }
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return { code: error.code, message: 'ยอดคงเหลือใน Wallet ไม่พอสำหรับยอดฝากและค่าแก๊ส' }
  }
  const contractError = getContractErrorName(error)
  if (contractError) {
    return {
      code: contractError,
      message: CONTRACT_ERROR_MESSAGES[contractError] || `Smart Contract ปฏิเสธรายการ (${contractError})`,
    }
  }
  return { code: error.code || 'UNKNOWN', message: error.shortMessage || error.message || 'ทำรายการไม่สำเร็จ' }
}
