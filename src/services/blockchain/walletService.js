import { BrowserProvider, formatEther } from 'ethers'
import { contractConfig } from '@/config/contractConfig'
import { WalletError, normalizeWalletError } from './errors'

export function getEthereumProvider() {
  if (typeof window === 'undefined') return null
  return window.ethereum || null
}

export function isWalletAvailable() {
  return Boolean(getEthereumProvider())
}

export function formatWalletAddress(address, size = 4) {
  if (!address) return ''
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`
}

/**
 * Requests accounts from the injected wallet and reads the ACTUAL chain id.
 * Nothing is reported as connected until the wallet returns an account.
 */
export async function connectWallet() {
  const ethereum = getEthereumProvider()
  if (!ethereum) {
    throw new WalletError(
      'ไม่พบ Wallet ในเบราว์เซอร์นี้ — กรุณาติดตั้ง MetaMask หรือ wallet ที่รองรับ EIP-1193',
      'NO_PROVIDER',
    )
  }
  try {
    const provider = new BrowserProvider(ethereum)
    const accounts = await provider.send('eth_requestAccounts', [])
    if (!accounts?.length) {
      throw new WalletError('Wallet ไม่ได้ส่งคืนบัญชี', 'NO_ACCOUNT')
    }
    const network = await provider.getNetwork()
    return {
      address: accounts[0],
      chainId: Number(network.chainId),
      provider,
    }
  } catch (error) {
    const normalized = normalizeWalletError(error)
    throw new WalletError(normalized.message, normalized.code)
  }
}

/**
 * Wallets cannot be disconnected programmatically. This clears the app-side
 * connection state and is intentionally honest about that limitation.
 */
export async function disconnectWallet() {
  return { disconnected: true, note: 'ล้างสถานะในแอปแล้ว — Wallet อาจยังคงอนุญาตบัญชีนี้อยู่' }
}

/** Reads the real native balance from the connected wallet provider. */
export async function getNativeBalance(address) {
  const ethereum = getEthereumProvider()
  if (!ethereum || !address) return null
  const provider = new BrowserProvider(ethereum)
  const balance = await provider.getBalance(address)
  return formatEther(balance)
}

export async function getWalletChainId() {
  const ethereum = getEthereumProvider()
  if (!ethereum) return null
  const chainIdHex = await ethereum.request({ method: 'eth_chainId' })
  return Number.parseInt(chainIdHex, 16)
}

/** Requires VITE_CHAIN_ID; throws until the contract teammate confirms a network. */
export async function switchNetwork(chainId = contractConfig.chainId) {
  const ethereum = getEthereumProvider()
  if (!ethereum) throw new WalletError('ไม่พบ Wallet ในเบราว์เซอร์นี้', 'NO_PROVIDER')
  if (!chainId) {
    throw new WalletError(
      'ยังไม่ได้กำหนด Network / Chain ID — รอข้อมูลจากทีม Smart Contract',
      'CHAIN_NOT_CONFIGURED',
    )
  }
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${Number(chainId).toString(16)}` }],
    })
    return { chainId }
  } catch (error) {
    const normalized = normalizeWalletError(error)
    throw new WalletError(normalized.message, normalized.code)
  }
}

export function subscribeToWalletEvents({ onAccountsChanged, onChainChanged } = {}) {
  const ethereum = getEthereumProvider()
  if (!ethereum?.on) return () => {}
  const accountHandler = (accounts) => onAccountsChanged?.(accounts)
  const chainHandler = (chainIdHex) => onChainChanged?.(Number.parseInt(chainIdHex, 16))
  ethereum.on('accountsChanged', accountHandler)
  ethereum.on('chainChanged', chainHandler)
  return () => {
    ethereum.removeListener?.('accountsChanged', accountHandler)
    ethereum.removeListener?.('chainChanged', chainHandler)
  }
}
