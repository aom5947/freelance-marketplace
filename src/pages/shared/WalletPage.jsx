import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Link2,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { transactionService } from '@/services/api/transactionService'
import { getNativeBalance } from '@/services/blockchain/walletService'
import { contractConfig, getMissingContractConfig, isContractConfigured } from '@/config/contractConfig'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { transactionStatus, transactionTypes } from '@/constants'
import { formatCurrency, formatDate, shortAddress } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function WalletPage() {
  useDocumentTitle('กระเป๋าเงิน')
  const { user } = useAuth()
  const wallet = useWallet()
  const toast = useToast()
  const { data, loading, error, refresh } = useAsync(
    () => transactionService.list(user?.id),
    [user?.id],
  )
  const [balance, setBalance] = useState(null)
  const [balanceError, setBalanceError] = useState(null)

  const missing = getMissingContractConfig()
  const configured = isContractConfigured()

  useEffect(() => {
    let active = true
    setBalance(null)
    setBalanceError(null)
    if (!wallet.isConnected || !wallet.address) return undefined
    getNativeBalance(wallet.address)
      .then((value) => active && setBalance(value))
      .catch((err) => active && setBalanceError(err.message))
    return () => {
      active = false
    }
  }, [wallet.isConnected, wallet.address])

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="กระเป๋าเงินและ Escrow"
        description="เชื่อมต่อ Wallet ตรวจสอบ network และดูสถานะความพร้อมของ Smart Contract"
        actions={<WalletConnectButton size="md" />}
      />

      <InfoBanner tone="warning" className="mb-5" title="สถานะการเชื่อมต่อ">
        การเชื่อมต่อ Wallet ทำงานกับ provider จริงในเบราว์เซอร์ของคุณ
        แต่ธุรกรรม escrow จะยังไม่ทำงานจนกว่าจะได้รับ ABI, Contract Address และ Chain ID จากทีม
      </InfoBanner>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white">
            <div className="surface-grid-dark absolute inset-0" aria-hidden="true" />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/30 blur-[70px]" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  <Wallet className="h-3.5 w-3.5" /> Connected wallet
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold',
                    wallet.isConnected
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-white/10 text-white/50',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      wallet.isConnected ? 'bg-emerald-400' : 'bg-white/30',
                    )}
                  />
                  {wallet.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <p className="mt-5 break-all font-mono text-[13px] text-white/85">
                {wallet.address || 'ยังไม่ได้เชื่อมต่อ Wallet'}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] text-white/35">Network / Chain ID</p>
                  <p className="mt-0.5 text-sm font-bold">
                    {wallet.chainId || '—'}
                    {wallet.isWrongNetwork && (
                      <span className="ml-1 text-[10px] font-medium text-amber-300">ไม่ตรง config</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/35">Native balance</p>
                  <p className="mt-0.5 text-sm font-bold">
                    {wallet.isConnected
                      ? balance !== null
                        ? `${Number(balance).toFixed(4)}`
                        : balanceError
                          ? 'อ่านไม่ได้'
                          : 'กำลังอ่าน…'
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {wallet.isConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(wallet.address)
                        toast.success('คัดลอกที่อยู่แล้ว')
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[11px] font-semibold text-white/80 transition hover:bg-white/[0.12]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {shortAddress(wallet.address)}
                    </button>
                    <button
                      type="button"
                      onClick={wallet.disconnect}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-400/20"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      ยกเลิกการเชื่อมต่อ
                    </button>
                    {wallet.isWrongNetwork && (
                      <button
                        type="button"
                        onClick={wallet.switchNetwork}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-400/15 px-3 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/25"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        สลับ Network
                      </button>
                    )}
                  </>
                ) : (
                  <WalletConnectButton variant="dark" dark size="md" />
                )}
              </div>

              {!wallet.isAvailable && (
                <p className="mt-3 text-[10.5px] leading-relaxed text-amber-200/80">
                  ไม่พบ Wallet provider ในเบราว์เซอร์นี้ — ติดตั้ง MetaMask หรือ wallet ที่รองรับ EIP-1193
                  เพื่อทดสอบการเชื่อมต่อ
                </p>
              )}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">ประวัติธุรกรรมล่าสุด</h2>
              <Link to="/freelancer/transactions" className="text-[10.5px] font-semibold text-brand-700 hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>

            {loading ? (
              <div className="mt-3">
                <TableSkeleton rows={3} />
              </div>
            ) : error ? (
              <ErrorState error={error} onRetry={refresh} className="mt-3" />
            ) : (data || []).length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="ยังไม่มีธุรกรรม"
                description="เมื่อมีรายได้ คำขอถอน หรือการฝาก escrow รายการจะแสดงที่นี่"
              />
            ) : (
              <ul className="mt-3 divide-y divide-ink/[0.06]">
                {data.slice(0, 6).map((tx) => {
                  const status = transactionStatus[tx.status]
                  return (
                    <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          to={`/transactions/${tx.id}`}
                          className="truncate text-[12px] font-medium text-ink transition hover:text-brand-700"
                        >
                          {tx.note}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-ink-400">
                          {formatDate(tx.createdAt)} · {transactionTypes[tx.type]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-bold text-ink">{formatCurrency(tx.amount)}</p>
                        <StatusBadge label={status?.label} tone={status?.tone} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Smart Contract readiness</h2>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[9px] font-bold',
                  configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                )}
              >
                {configured ? 'READY' : 'PENDING'}
              </span>
            </div>

            <ul className="mt-3 space-y-2.5">
              {[
                { label: 'Contract address', ready: Boolean(contractConfig.contractAddress), value: contractConfig.contractAddress },
                { label: 'Chain ID', ready: Boolean(contractConfig.chainId), value: contractConfig.chainId },
                { label: 'ABI', ready: Array.isArray(contractConfig.abi) && contractConfig.abi.length > 0 },
                { label: 'Escrow currency', ready: Boolean(contractConfig.currency.type) },
                { label: 'Function names', ready: Boolean(contractConfig.methods.depositEscrow) },
                { label: 'Event definitions', ready: false },
              ].map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-ink-500">{item.label}</span>
                  {item.ready ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {item.value || 'พร้อม'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Clock3 className="h-3 w-3" /> รอข้อมูล
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {missing.length > 0 && (
              <InfoBanner tone="danger" className="mt-3" title="ยังไม่สามารถทำธุรกรรมได้">
                ต้องได้รับจากทีม Smart Contract: {missing.join(', ')}
              </InfoBanner>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">ลิงก์ที่เกี่ยวข้อง</h2>
            <div className="mt-3 space-y-1">
              <Link
                to="/client/projects"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[11.5px] font-medium text-ink-600 transition hover:bg-paper"
              >
                โครงการและ Escrow
                <ExternalLink className="h-3.5 w-3.5 text-ink-300" />
              </Link>
              <Link
                to="/freelancer/earnings"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[11.5px] font-medium text-ink-600 transition hover:bg-paper"
              >
                รายได้ของฉัน
                <ExternalLink className="h-3.5 w-3.5 text-ink-300" />
              </Link>
              <a
                href="https://docs.ethers.org/v6/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[11.5px] font-medium text-ink-600 transition hover:bg-paper"
              >
                เอกสาร ethers.js
                <ExternalLink className="h-3.5 w-3.5 text-ink-300" />
              </a>
            </div>
          </section>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <div className="flex items-center gap-2 text-[12px] font-bold text-ink">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ปลอดภัยเมื่อเชื่อมต่อ
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
              Freelink ไม่เก็บ private key หรือ seed phrase ของคุณ การลงนามทุกครั้งเกิดขึ้นใน Wallet
              ของคุณเท่านั้น
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-400">
              <Link2 className="h-3 w-3" />
              Chain ID ที่ตั้งไว้: {contractConfig.chainId || 'ยังไม่กำหนด'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
