import { BrowserProvider, Contract, parseUnits } from 'ethers'
import { contractConfig, getMissingContractConfig, isContractConfigured } from '@/config/contractConfig'
import { ContractNotConfiguredError, normalizeWalletError, WalletError } from './errors'
import { getEthereumProvider } from './walletService'

/**
 * Smart-contract service — INTENTIONALLY NON-FUNCTIONAL until the Solidity
 * teammate delivers ABI, address, chain id and function names.
 *
 * Every function throws ContractNotConfiguredError instead of pretending a
 * transaction succeeded. The UI renders these errors honestly.
 */
function requireConfigured() {
  if (!isContractConfigured()) {
    throw new ContractNotConfiguredError(getMissingContractConfig())
  }
}

function requireMethod(name) {
  const method = contractConfig.methods[name]
  if (!method) {
    throw new ContractNotConfiguredError(
      [`Function name: ${name}`],
      `ยังไม่ทราบชื่อฟังก์ชัน ${name} ของ Smart Contract`,
    )
  }
  return method
}

async function getProvider() {
  const ethereum = getEthereumProvider()
  if (!ethereum) throw new WalletError('ไม่พบ Wallet ในเบราว์เซอร์นี้', 'NO_PROVIDER')
  return new BrowserProvider(ethereum)
}

async function getSignerContract() {
  const provider = await getProvider()
  const signer = await provider.getSigner()
  return new Contract(contractConfig.contractAddress, contractConfig.abi, signer)
}

/** TODO(contract): confirm `getEscrow` signature and return shape. */
export async function readEscrow(projectId) {
  requireConfigured()
  const method = requireMethod('getEscrow')
  try {
    const provider = await getProvider()
    const contract = new Contract(contractConfig.contractAddress, contractConfig.abi, provider)
    return await contract[method](projectId)
  } catch (error) {
    const normalized = normalizeWalletError(error)
    throw new WalletError(normalized.message, normalized.code)
  }
}

/**
 * TODO(contract): confirm deposit signature, currency handling and event names.
 * Native currency: value is attached. ERC-20: requires approve() first — not
 * implemented until the token contract details arrive.
 */
export async function depositEscrow({ projectId, amount }) {
  requireConfigured()
  const method = requireMethod('depositEscrow')
  if (!contractConfig.currency.type) {
    throw new ContractNotConfiguredError(['Escrow currency'], 'ยังไม่ทราบสกุลเงินที่ใช้ใน Escrow')
  }
  if (contractConfig.currency.type === 'erc20') {
    throw new ContractNotConfiguredError(
      ['ERC-20 approve flow'],
      'ยังไม่ได้เตรียมลำดับ approve() สำหรับ ERC-20',
    )
  }
  const contract = await getSignerContract()
  const value = parseUnits(String(amount), contractConfig.currency.decimals || 18)
  return contract[method](projectId, { value })
}

/** TODO(contract): confirm release signature and who is authorised to call it. */
export async function releasePayment({ projectId }) {
  requireConfigured()
  const method = requireMethod('releasePayment')
  const contract = await getSignerContract()
  return contract[method](projectId)
}

/** TODO(contract): confirm refund signature and dispute conditions. */
export async function refundClient({ projectId }) {
  requireConfigured()
  const method = requireMethod('refundClient')
  const contract = await getSignerContract()
  return contract[method](projectId)
}

/** TODO(contract): confirm dispute function signature. */
export async function openDispute({ projectId, reason }) {
  requireConfigured()
  const method = requireMethod('openDispute')
  const contract = await getSignerContract()
  return contract[method](projectId, reason)
}

export { isContractConfigured, getMissingContractConfig }
