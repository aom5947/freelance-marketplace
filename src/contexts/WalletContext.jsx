import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { contractConfig } from '@/config/contractConfig'
import {
  connectWallet as connectWalletService,
  disconnectWallet as disconnectWalletService,
  isWalletAvailable,
  switchNetwork as switchNetworkService,
  subscribeToWalletEvents,
} from '@/services/blockchain/walletService'
import { useToast } from './ToastContext'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const toast = useToast()
  const [address, setAddress] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState(null)

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    try {
      const result = await connectWalletService()
      setAddress(result.address)
      setChainId(result.chainId)
      setStatus('connected')
      toast.success('เชื่อมต่อ Wallet แล้ว', 'สถานะนี้มาจาก Wallet ในเบราว์เซอร์ของคุณ')
      return result
    } catch (err) {
      setStatus('disconnected')
      setError(err)
      toast.error('เชื่อมต่อ Wallet ไม่สำเร็จ', err.message)
      throw err
    }
  }, [toast])

  const disconnect = useCallback(async () => {
    await disconnectWalletService()
    setAddress(null)
    setChainId(null)
    setStatus('disconnected')
    setError(null)
    toast.info('ยกเลิกการเชื่อมต่อในแอปแล้ว', 'Wallet ของคุณอาจยังอนุญาตบัญชีนี้อยู่ — จัดการได้ในตัว Wallet')
  }, [toast])

  const switchNetwork = useCallback(async () => {
    try {
      await switchNetworkService()
      toast.success('สลับ Network แล้ว')
    } catch (err) {
      toast.warning('ยังสลับ Network ไม่ได้', err.message)
    }
  }, [toast])

  useEffect(() => {
    const unsubscribe = subscribeToWalletEvents({
      onAccountsChanged: (accounts) => {
        if (!accounts?.length) {
          setAddress(null)
          setChainId(null)
          setStatus('disconnected')
        } else {
          setAddress(accounts[0])
          setStatus('connected')
        }
      },
      onChainChanged: (nextChainId) => setChainId(nextChainId),
    })
    return unsubscribe
  }, [])

  const expectedChainId = contractConfig.chainId
  const isWrongNetwork = Boolean(chainId && expectedChainId && chainId !== expectedChainId)

  const value = useMemo(
    () => ({
      address,
      chainId,
      status,
      error,
      isAvailable: isWalletAvailable(),
      isConnected: status === 'connected' && Boolean(address),
      isWrongNetwork,
      expectedChainId,
      connect,
      disconnect,
      switchNetwork,
    }),
    [address, chainId, status, error, isWrongNetwork, expectedChainId, connect, disconnect, switchNetwork],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used inside <WalletProvider>')
  return context
}
