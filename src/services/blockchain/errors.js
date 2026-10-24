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
  return { code: error.code || 'UNKNOWN', message: error.message || 'ทำรายการไม่สำเร็จ' }
}
