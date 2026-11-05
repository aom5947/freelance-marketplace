import { AbiCoder, BrowserProvider, Contract, getAddress, id, isAddress, keccak256, toUtf8Bytes } from 'ethers'
import { contractConfig, getMissingContractConfig, isContractConfigured } from '@/config/contractConfig'
import { ContractNotConfiguredError, normalizeWalletError, WalletError } from './errors'
import { getEthereumProvider, getWalletChainId } from './walletService'

/**
 * FreelinkEscrow v2 (native ETH). Every function either talks to the real
 * contract or throws — nothing here pretends a transaction succeeded.
 *
 * Money rules (see smart-contact/docs/BACKEND_START_ver_0_2.md):
 *  - `amount` is the freelancer's pay in wei; the contract adds its own fee and
 *    `msg.value` must equal `quote(amount).total` exactly.
 *  - after the deposit every function takes `escrowId`, not `projectId`.
 */

/** On-chain `Status` enum, index = Solidity value. */
export const CHAIN_STATUS = [
  'unfunded',
  'funded',
  'active',
  'submitted',
  'disputed',
  'released',
  'refunded',
  'resolved',
]

const SECONDS_PER_DAY = 86400
const MIN_DEADLINE_SECONDS = 7 * SECONDS_PER_DAY // freelancer should have at least a week after a deposit
const MAX_DEADLINE_SECONDS = 364 * SECONDS_PER_DAY // contract rejects > 365 days

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

/**
 * A payable call to an address with no code SUCCEEDS and sends the ETH away, so
 * the chain must be checked before every write (also checks the address has code).
 */
async function requireRightChain(provider) {
  const current = await getWalletChainId()
  if (current !== contractConfig.chainId) {
    throw new WalletError(
      `Wallet อยู่คนละ Network — กรุณาสลับไป ${contractConfig.chainName} (Chain ${contractConfig.chainId})`,
      'WRONG_NETWORK',
    )
  }
  const code = await provider.getCode(contractConfig.contractAddress)
  if (!code || code === '0x') {
    throw new WalletError(
      `ไม่พบ Smart Contract ที่ ${contractConfig.contractAddress} บน ${contractConfig.chainName} — ตรวจ VITE_CONTRACT_ADDRESS`,
      'WRONG_NETWORK',
    )
  }
}

async function getReadContract() {
  requireConfigured()
  const provider = await getProvider()
  return new Contract(contractConfig.contractAddress, contractConfig.abi, provider)
}

async function getSignerContract() {
  requireConfigured()
  const provider = await getProvider()
  await requireRightChain(provider)
  const signer = await provider.getSigner()
  return new Contract(contractConfig.contractAddress, contractConfig.abi, signer)
}

// ---------- Pure helpers (no wallet needed) ----------

/** projectId (bytes32) = keccak256(utf8(project.id)) */
export function toProjectKey(projectId) {
  return id(String(projectId))
}

/** Same formula as the contract's computeEscrowId: keccak256(abi.encode(client, projectId)). */
export function getEscrowId({ clientAddress, projectId }) {
  if (!isAddress(clientAddress)) {
    throw new WalletError('ไม่ทราบ address ของลูกค้าที่ฝากเงิน', 'INVALID_ADDRESS')
  }
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ['address', 'bytes32'],
    [getAddress(clientAddress), toProjectKey(projectId)],
  )
  return keccak256(encoded)
}

/**
 * THB -> wei with integer maths only (floats would drift). 2 decimals of THB and
 * of the rate are kept; the result is rounded down.
 */
export function thbToWei(thb, thbPerEth) {
  const thbSatang = BigInt(Math.round(Number(thb) * 100))
  const rateSatang = BigInt(Math.round(Number(thbPerEth) * 100))
  if (thbSatang <= 0n || rateSatang <= 0n) {
    throw new WalletError('ยอดเงินหรืออัตราแลกเปลี่ยนไม่ถูกต้อง', 'INVALID_AMOUNT')
  }
  return (thbSatang * 10n ** 18n) / rateSatang
}

/**
 * Interim terms hash: a stable JSON of the agreed scope, hashed. The freelancer must
 * submit the SAME hash to accept. TODO(team): the backend should own this value
 * (section 4.4 of the guide) — keep the field order stable if this changes.
 */
export function buildTermsHash(project) {
  const terms = {
    v: 1,
    projectId: String(project.id),
    jobId: project.jobId ?? null,
    title: project.title,
    budget: Number(project.budget),
  }
  return keccak256(toUtf8Bytes(JSON.stringify(terms)))
}

/**
 * Interim deadline (unix seconds): the project's dueDate, but at least a week from
 * now and never beyond what the contract accepts. TODO(team): confirm the rule.
 */
export function buildDeadline(project, now = Date.now()) {
  const nowSeconds = Math.floor(now / 1000)
  const due = project.dueDate ? Math.floor(new Date(project.dueDate).getTime() / 1000) : 0
  const earliest = nowSeconds + MIN_DEADLINE_SECONDS
  const latest = nowSeconds + MAX_DEADLINE_SECONDS
  return BigInt(Math.min(Math.max(due || 0, earliest), latest))
}

// ---------- Reads ----------

/** Fee and total (wei) for a freelancer pay of `amountWei`, computed by the contract. */
export async function quote(amountWei) {
  const contract = await getReadContract()
  const [fee, total] = await contract[requireMethod('quote')](amountWei)
  return { fee, total }
}

/** Immutable policy values of the deployed contract. Never hard-code these in the UI. */
export async function readPolicy() {
  const contract = await getReadContract()
  const [feeBps, reviewPeriod, arbiterTimeout, revisionPeriod, maxRevisions] = await Promise.all([
    contract.feeBps(),
    contract.reviewPeriod(),
    contract.arbiterTimeout(),
    contract.revisionPeriod(),
    contract.maxRevisions(),
  ])
  return {
    feeBps: Number(feeBps),
    reviewPeriod: Number(reviewPeriod),
    arbiterTimeout: Number(arbiterTimeout),
    revisionPeriod: Number(revisionPeriod),
    maxRevisions: Number(maxRevisions),
  }
}

/**
 * Reads an escrow and converts ethers' bigint fields: enums/uint8 -> Number,
 * unix seconds -> Number, money stays bigint. Returns null if nothing was deposited.
 */
export async function readEscrow({ escrowId }) {
  try {
    const contract = await getReadContract()
    const raw = await contract[requireMethod('getEscrow')](escrowId)
    const status = Number(raw.status)
    if (status === 0) return null
    return {
      escrowId,
      client: raw.client,
      freelancer: raw.freelancer,
      arbiter: raw.arbiter,
      amount: raw.amount,
      fee: raw.fee,
      termsHash: raw.termsHash,
      deadline: Number(raw.deadline),
      reviewEndsAt: Number(raw.reviewEndsAt),
      disputedAt: Number(raw.disputedAt),
      payoutBps: Number(raw.payoutBps),
      revisionCount: Number(raw.revisionCount),
      status,
      statusName: CHAIN_STATUS[status] || `unknown(${status})`,
    }
  } catch (error) {
    if (error instanceof ContractNotConfiguredError || error instanceof WalletError) throw error
    const normalized = normalizeWalletError(error)
    throw new WalletError(normalized.message, normalized.code)
  }
}

// ---------- Writes (each returns the ethers tx; wrap with executeTransaction) ----------

export async function depositEscrow({ projectId, freelancerAddress, deadline, termsHash, amountWei }) {
  const method = requireMethod('depositEscrow')
  if (!isAddress(freelancerAddress)) {
    throw new WalletError('address ของ freelancer ไม่ถูกต้อง', 'INVALID_ADDRESS')
  }
  const contract = await getSignerContract()
  const [, total] = await contract[requireMethod('quote')](amountWei)
  return contract[method](toProjectKey(projectId), getAddress(freelancerAddress), deadline, termsHash, amountWei, {
    value: total,
  })
}

/** freelancer: must pass the same termsHash the client bound at deposit. */
export async function acceptEscrow({ escrowId, termsHash }) {
  const contract = await getSignerContract()
  return contract[requireMethod('acceptEscrow')](escrowId, termsHash)
}

/** freelancer: workHash = keccak256 of the off-chain link/file. */
export async function submitWork({ escrowId, workHash }) {
  const contract = await getSignerContract()
  return contract[requireMethod('submitWork')](escrowId, workHash)
}

/** client approves and pays the freelancer. */
export async function releasePayment({ escrowId }) {
  const contract = await getSignerContract()
  return contract[requireMethod('releasePayment')](escrowId)
}

/** client asks for changes (reason is stored on-chain permanently — no personal data). */
export async function requestRevision({ escrowId, reason }) {
  const contract = await getSignerContract()
  return contract[requireMethod('requestRevision')](escrowId, reason)
}

/** freelancer collects payment after the review period ended without client action. */
export async function claimAfterReview({ escrowId }) {
  const contract = await getSignerContract()
  return contract[requireMethod('claimAfterReview')](escrowId)
}

export async function refundClient({ escrowId }) {
  const contract = await getSignerContract()
  return contract[requireMethod('refundClient')](escrowId)
}

/** reason is stored on-chain permanently — no personal data. */
export async function openDispute({ escrowId, reason }) {
  const contract = await getSignerContract()
  return contract[requireMethod('openDispute')](escrowId, reason)
}

export async function settleExpiredDispute({ escrowId }) {
  const contract = await getSignerContract()
  return contract[requireMethod('settleExpiredDispute')](escrowId)
}

/** pull-payment fallback for payouts that could not be sent at settlement. */
export async function withdraw() {
  const contract = await getSignerContract()
  return contract[requireMethod('withdraw')]()
}

export { isContractConfigured, getMissingContractConfig }
