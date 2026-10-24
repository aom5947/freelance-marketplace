/**
 * Smart-contract configuration.
 *
 * Everything in this file is a PLACEHOLDER until the Solidity teammate delivers:
 *  - deployed contract address
 *  - ABI (copy the compiled JSON here or import from a generated artifact)
 *  - target chain id / network name
 *  - escrow function names + parameters
 *  - event definitions
 *  - token or native currency details
 *
 * Creating a wallet connection does NOT mean payments work. Contract calls must
 * stay disabled until `isContractConfigured()` returns true.
 */
const env = import.meta.env

export const contractConfig = {
  // TODO(contract): chain id, e.g. 11155111 (Sepolia) or 31337 (local anvil/hardhat)
  chainId: env.VITE_CHAIN_ID ? Number(env.VITE_CHAIN_ID) : null,
  chainName: null, // TODO(contract): human-readable network name

  // TODO(contract): deployed escrow contract address
  contractAddress: env.VITE_CONTRACT_ADDRESS || null,

  // TODO(contract): paste the ABI delivered by the contract teammate.
  // Example shape:
  // abi: [{ type: 'function', name: '...', inputs: [...], outputs: [...] }],
  abi: null,

  // TODO(contract): the escrow currency agreed with the team.
  // Could be native currency (ETH/MATIC) or an ERC-20 token address.
  currency: {
    type: null, // 'native' | 'erc20' | null
    symbol: null,
    address: null,
    decimals: 18,
  },

  // TODO(contract): confirm these names once the contract ABI is available.
  methods: {
    depositEscrow: null,
    releasePayment: null,
    refundClient: null,
    getEscrow: null,
    openDispute: null,
  },

  explorerUrl: env.VITE_EXPLORER_URL || null,
}

/** True only when address, chain id and ABI have all been delivered. */
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
  if (!contractConfig.contractAddress) missing.push('Contract Address')
  if (!contractConfig.chainId) missing.push('Network / Chain ID')
  if (!Array.isArray(contractConfig.abi) || contractConfig.abi.length === 0) missing.push('Contract ABI')
  if (!contractConfig.currency.type) missing.push('Escrow Currency (native หรือ ERC-20)')
  if (!contractConfig.methods.depositEscrow) missing.push('Escrow Function Names & Parameters')
  return missing
}
