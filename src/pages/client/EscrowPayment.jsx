import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Info,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { projectService } from '@/services/api/projectService'
import { transactionService } from '@/services/api/transactionService'
import * as contractService from '@/services/blockchain/contractService'
import { TX_STATUS, executeTransaction } from '@/services/blockchain/transactionService'
import { contractConfig, getMissingContractConfig, isContractConfigured } from '@/config/contractConfig'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { TransactionStatus } from '@/components/wallet/TransactionStatus'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'

import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { escrowStatus } from '@/constants'
import { formatCurrency, formatDate, shortAddress } from '@/utils/format'
import { cn } from '@/utils/cn'

const PLATFORM_FEE_RATE = 0.05

export default function EscrowPayment() {
  const { projectId } = useParams()
  const wallet = useWallet()
  const toast = useToast()
  const { user } = useAuth()
  const { data: project, loading, error, refresh } = useAsync(
    () => projectService.getProject(projectId),
    [projectId],
  )
  useDocumentTitle(project ? `Escrow — ${project.title}` : 'Escrow')

  const { data: transactions } = useAsync(() => transactionService.list(user?.id), [user?.id])
  const [tx, setTx] = useState({ status: TX_STATUS.IDLE, hash: null, error: null })
  const [busy, setBusy] = useState(false)

  const missing = getMissingContractConfig()
  const configured = isContractConfigured()

  const projectTransactions = useMemo(
    () => (transactions || []).filter((transaction) => transaction.projectId === projectId),
    [transactions, projectId],
  )

  if (loading) return <PageLoader />
  if (error || !project) return <ErrorState error={error} onRetry={refresh} />

  if (project.clientId !== user?.profileId) {
    return (
      <EmptyState
        title="คุณไม่มีสิทธิ์จัดการ Escrow ของโครงการนี้"
        description="โครงการนี้เป็นของบัญชีลูกค้าอื่น"
        action={
          <Button to="/client/projects" variant="primary">
            กลับไปโครงการของฉัน
          </Button>
        }
      />
    )
  }

  const escrow = escrowStatus[project.escrowStatus]
  const fee = Math.round(project.budget * PLATFORM_FEE_RATE)
  const total = project.budget + fee
  const funded = project.escrowStatus !== 'unfunded'

  const handleDeposit = async () => {
    setTx({ status: TX_STATUS.IDLE, hash: null, error: null })

    if (!wallet.isConnected) {
      try {
        await wallet.connect()
      } catch {
        return
      }
    }

    if (!configured) {
      const message = `ยังไม่สามารถฝากเงินได้: ต้องได้รับ ${missing.join(', ')} จากทีม Smart Contract ก่อน`
      setTx({ status: TX_STATUS.FAILED, hash: null, error: message })
      toast.warning('Smart Contract ยังไม่พร้อม', message)
      return
    }

    setBusy(true)
    try {
      const result = await executeTransaction(
        () => contractService.depositEscrow({ projectId: project.id, amount: total }),
        { onStatus: (next) => setTx(next) },
      )
      setTx((current) => ({
        ...current,
        status: result.status,
        hash: result.hash || current.hash,
        error: result.error || null,
      }))
      if (result.status === TX_STATUS.CONFIRMED) {
        toast.success('ฝากเงินสำเร็จ', 'ได้รับการยืนยันจาก blockchain แล้ว')
        refresh()
      }
    } catch (err) {
      setTx({ status: TX_STATUS.FAILED, hash: null, error: err.message })
      toast.error('ฝากเงินไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleRelease = async () => {
    if (!configured) {
      const message = `ยังไม่สามารถปล่อยเงินได้: ขาด ${missing.join(', ')}`
      setTx({ status: TX_STATUS.FAILED, hash: null, error: message })
      toast.warning('Smart Contract ยังไม่พร้อม', message)
      return
    }
    if (!wallet.isConnected) {
      try {
        await wallet.connect()
      } catch {
        return
      }
    }
    setBusy(true)
    try {
      const result = await executeTransaction(
        () => contractService.releasePayment({ projectId: project.id }),
        { onStatus: (next) => setTx(next) },
      )
      setTx((current) => ({
        ...current,
        status: result.status,
        hash: result.hash || current.hash,
        error: result.error || null,
      }))
      if (result.status === TX_STATUS.CONFIRMED) {
        toast.success('ปล่อยเงินสำเร็จ', 'ธุรกรรมได้รับการยืนยันบน blockchain')
        refresh()
      }
    } catch (err) {
      setTx({ status: TX_STATUS.FAILED, hash: null, error: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Escrow & payment"
        title="Escrow และการจ่ายเงิน"
        description={project.title}
        backTo={`/client/projects/${project.id}`}
        backLabel="กลับไปรายละเอียดโครงการ"
        actions={<StatusBadge label={escrow?.label} tone={escrow?.tone} pulse={project.escrowStatus === 'funded'} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="relative overflow-hidden bg-ink px-5 py-6 text-white">
              <div className="surface-grid-dark absolute inset-0" aria-hidden="true" />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Escrow amount
                </p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight">
                  {formatCurrency(project.budget)}
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  {funded
                    ? `ฝากแล้ว ${formatCurrency(project.escrowAmount)} · ปล่อยแล้ว ${formatCurrency(project.releasedAmount)}`
                    : 'ยังไม่มีการฝากเงินเข้า escrow สำหรับโครงการนี้'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-[10.5px] text-white/45">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    คุ้มครองจนกว่าจะตรวจรับ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    ต้องมี Wallet และ Contract
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <h2 className="text-sm font-bold">ขั้นตอนการชำระเงิน</h2>
              <ol className="mt-4 space-y-4">
                {[
                  {
                    title: 'เชื่อมต่อ Wallet',
                    description: wallet.isConnected
                      ? `เชื่อมต่อแล้ว: ${shortAddress(wallet.address)} · Chain ${wallet.chainId}`
                      : 'เชื่อม Wallet เพื่อยืนยันตัวตนและลงนามธุรกรรม',
                    done: wallet.isConnected,
                    icon: Wallet,
                  },
                  {
                    title: 'ฝากเงินเข้า Escrow',
                    description: funded
                      ? 'โครงการนี้มีเงินอยู่ใน escrow แล้ว (ข้อมูลจำลอง)'
                      : 'ฝากยอดโครงการ + ค่าธรรมเนียมผ่าน Smart Contract',
                    done: funded,
                    icon: CircleDollarSign,
                  },
                  {
                    title: 'ตรวจรับและปล่อยเงิน',
                    description: project.escrowStatus === 'released'
                      ? 'ปล่อยเงินแล้วตามการอนุมัติครั้งก่อน'
                      : 'ทำได้หลังตรวจรับงานและยืนยันจาก Wallet',
                    done: project.escrowStatus === 'released',
                    icon: CheckCircle2,
                  },
                ].map((step) => {
                  const Icon = step.icon
                  return (
                    <li key={step.title} className="flex gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          step.done ? 'bg-emerald-50 text-emerald-600' : 'bg-paper text-ink-400',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-ink">{step.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{step.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>

              <div className="mt-5 border-t border-ink/[0.06] pt-4">
                <div className="flex items-center justify-between text-[11.5px] text-ink-500">
                  <span>มูลค่างาน</span>
                  <span>{formatCurrency(project.budget)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-ink-500">
                  <span>ค่าธรรมเนียมแพลตฟอร์ม (5% · ตัวอย่าง)</span>
                  <span>{formatCurrency(fee)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-ink/[0.06] pt-2 text-sm font-bold text-ink">
                  <span>ยอดรวมที่ต้องฝาก</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <WalletConnectButton size="md" />
                  <Button
                    variant="brand"
                    size="md"
                    icon={ArrowRight}
                    onClick={handleDeposit}
                    loading={busy}
                  >
                    ฝากเงินเข้า Escrow
                  </Button>
                  {funded && project.escrowStatus !== 'released' && (
                    <Button variant="secondary" size="md" onClick={handleRelease} loading={busy}>
                      ทดลองปล่อยเงิน
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-ink-400">
                  ปุ่มเหล่านี้จะไม่รายงานความสำเร็จหากยังไม่ได้รับข้อมูล Contract จริง
                </p>
              </div>

              <TransactionStatus
                status={tx.status}
                hash={tx.hash}
                error={tx.error}
                className="mt-3"
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">ธุรกรรมของโครงการนี้</h2>
            {projectTransactions.length === 0 ? (
              <p className="mt-3 rounded-xl bg-paper px-4 py-4 text-center text-[11.5px] text-ink-500">
                ยังไม่มีธุรกรรมที่บันทึกไว้
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-ink/[0.06]">
                {projectTransactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{transaction.note}</p>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        {formatDate(transaction.createdAt)} · {transaction.isMock ? 'ข้อมูลจำลอง' : 'บน blockchain'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-ink">{formatCurrency(transaction.amount)}</p>
                      <p className="text-[10px] text-ink-400">{transaction.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">สถานะ Contract</h2>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[9px] font-bold',
                  configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                )}
              >
                {configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
              </span>
            </div>

            <ul className="mt-3 space-y-2">
              {[
                { label: 'Contract Address', ready: Boolean(contractConfig.contractAddress), value: contractConfig.contractAddress },
                { label: 'Chain ID', ready: Boolean(contractConfig.chainId), value: contractConfig.chainId },
                { label: 'ABI', ready: Array.isArray(contractConfig.abi) && contractConfig.abi.length > 0, value: null },
                { label: 'Escrow currency', ready: Boolean(contractConfig.currency.type), value: contractConfig.currency.symbol },
                { label: 'Function names', ready: Boolean(contractConfig.methods.depositEscrow), value: null },
              ].map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-ink-500">{item.label}</span>
                  {item.ready ? (
                    <span className="max-w-[150px] truncate font-mono text-[10px] text-emerald-600">
                      {item.value || 'พร้อม'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                      <Clock3 className="h-3 w-3" /> รอข้อมูล
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {missing.length > 0 && (
              <InfoBanner tone="danger" className="mt-3" title="ยังไม่พร้อมทำธุรกรรม">
                ขาด: {missing.join(' · ')}
              </InfoBanner>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 text-[12px] font-bold text-ink">
              <Info className="h-4 w-4 text-brand-600" />
              สิ่งที่จะเกิดขึ้นจริง
            </div>
            <ul className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-ink-500">
              <li>• กด “ฝากเงิน” แล้วระบบจะขอเชื่อม Wallet (ถ้ายังไม่เชื่อม)</li>
              <li>• หาก Contract ยังไม่ตั้งค่า ระบบจะแจ้งสิ่งที่ขาดและไม่ทำธุรกรรม</li>
              <li>• เมื่อเชื่อมต่อแล้ว จะแสดง pending → confirmed จาก blockchain จริง</li>
              <li>• transaction hash จะแสดงเฉพาะเมื่อได้รับจาก network</li>
            </ul>
            <a
              href="https://ethereum.org/en/developers/docs/standards/tokens/erc-20/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-700 hover:underline"
            >
              เอกสาร ERC-20 ที่เกี่ยวข้อง
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <InfoBanner tone="warning" title="Mock data">
            ยอดเงินและประวัติธุรกรรมในหน้านี้เป็นข้อมูลจำลอง การฝาก/ปล่อยเงินจริงจะเกิดขึ้นเมื่อเชื่อม
            contract เท่านั้น
          </InfoBanner>
        </aside>
      </div>
    </div>
  )
}
