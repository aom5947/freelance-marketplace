import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Copy, LogOut, Wallet } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { formatWalletAddress } from '@/services/blockchain/walletService'
import { cn } from '@/utils/cn'

export function WalletConnectButton({ variant = 'secondary', size = 'sm', className, dark = false }) {
  const wallet = useWallet()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleConnect = async () => {
    setBusy(true)
    try {
      await wallet.connect()
    } catch {
      // WalletContext already surfaced the real error in a toast.
    } finally {
      setBusy(false)
    }
  }

  if (!wallet.isConnected) {
    return (
      <Button
        variant={dark ? 'dark' : variant}
        size={size}
        onClick={handleConnect}
        loading={busy || wallet.status === 'connecting'}
        icon={Wallet}
        className={className}
        title={wallet.isAvailable ? 'เชื่อมต่อ Wallet' : 'ไม่พบ Wallet ในเบราว์เซอร์นี้'}
      >
        เชื่อม Wallet
      </Button>
    )
  }

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition',
          dark
            ? 'border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]'
            : 'border-ink/10 bg-white text-ink hover:border-brand-300',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-mono">{formatWalletAddress(wallet.address)}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-ink/[0.08] bg-white shadow-lift"
        >
          <div className="border-b border-ink/[0.06] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-ink-400">Wallet address</p>
            <p className="mt-0.5 break-all font-mono text-[11px] text-ink">{wallet.address}</p>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-ink-500">Chain ID</span>
              <span className={cn('font-semibold', wallet.isWrongNetwork ? 'text-rose-600' : 'text-emerald-600')}>
                {wallet.chainId ?? '—'}
                {wallet.isWrongNetwork ? ' (ไม่ตรงกับที่ตั้งไว้)' : ''}
              </span>
            </div>
            {wallet.isWrongNetwork && (
              <button
                type="button"
                onClick={wallet.switchNetwork}
                className="mt-2 w-full rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                สลับ Network
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(wallet.address)
              toast.success('คัดลอกที่อยู่แล้ว')
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-ink-600 transition hover:bg-paper"
            role="menuitem"
          >
            <Copy className="h-3.5 w-3.5" />
            คัดลอกที่อยู่
          </button>
          <button
            type="button"
            onClick={() => {
              wallet.disconnect()
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
            role="menuitem"
          >
            <LogOut className="h-3.5 w-3.5" />
            ยกเลิกการเชื่อมต่อในแอป
          </button>
        </div>
      )}
    </div>
  )
}
