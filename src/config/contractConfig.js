/**
 * Smart-contract configuration — FreelinkEscrow v2 (native ETH).
 *
 * The ABI is a copy of `smart-contact/abi/FreelinkEscrow.abi.json`. When the
 * contract changes, run `npm run export-abi` in `smart-contact/` and copy the
 * file over again.
 *
 * Address and chain id come from `.env` (VITE_CONTRACT_ADDRESS / VITE_CHAIN_ID).
 * Creating a wallet connection does NOT mean payments work. Contract calls stay
 * disabled until `isContractConfigured()` returns true.
 */
import abi from './FreelinkEscrow.abi.json'

const env = import.meta.env

const CHAIN_NAMES = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia',
  31337: 'Hardhat (local)',
}

const chainId = env.VITE_CHAIN_ID ? Number(env.VITE_CHAIN_ID) : null

// THB per 1 ETH. Product decision pending (BACKEND_START_ver_0_2.md, section 4.5):
// a fixed rate from .env is the interim approach. Never convert with floats — see thbToWei().
const thbPerEth = env.VITE_THB_PER_ETH ? Number(env.VITE_THB_PER_ETH) : null

export const contractConfig = {
  chainId,
  chainName: env.VITE_CHAIN_NAME || (chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : null),

  contractAddress: env.VITE_CONTRACT_ADDRESS || null,

  abi,

  // v2 escrows native ETH (no ERC-20 approve step).
  currency: {
    type: 'native',
    symbol: 'ETH',
    address: null,
    decimals: 18,
  },

  thbPerEth: Number.isFinite(thbPerEth) && thbPerEth > 0 ? thbPerEth : null,

  // Keys are what the UI calls, values are the Solidity function names.
  methods: {
    depositEscrow: 'depositEscrow',
    acceptEscrow: 'acceptEscrow',
    submitWork: 'submitWork',
    releasePayment: 'releasePayment',
    requestRevision: 'requestRevision',
    claimAfterReview: 'claimAfterReview',
    refundClient: 'refundClient',
    openDispute: 'openDispute',
    settleExpiredDispute: 'settleExpiredDispute',
    withdraw: 'withdraw',
    getEscrow: 'getEscrow',
    quote: 'quote',
    computeEscrowId: 'computeEscrowId',
  },

  explorerUrl: env.VITE_EXPLORER_URL || null,
}

/** True only when address, chain id and ABI have all been provided. */
export function isContractConfigured() {
  return Boolean(
    contractConfig.contractAddress &&
      contractConfig.chainId &&
      Array.isArray(contractConfig.abi) &&
      contractConfig.abi.length > 0,
  )
}

/** Human-readable list of what is still missing, used by the wallet/escrow UI. */
export function getMissingContractConfig() {
  const missing = []
  if (!contractConfig.contractAddress) missing.push('Contract Address (VITE_CONTRACT_ADDRESS)')
  if (!contractConfig.chainId) missing.push('Network / Chain ID (VITE_CHAIN_ID)')
  if (!Array.isArray(contractConfig.abi) || contractConfig.abi.length === 0) missing.push('Contract ABI')
  if (!contractConfig.thbPerEth) missing.push('อัตราแลกเปลี่ยน บาท/ETH (VITE_THB_PER_ETH)')
  return missing
}
