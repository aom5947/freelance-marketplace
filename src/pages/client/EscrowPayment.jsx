import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatEther, isAddress } from 'ethers'
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
import { TX_STATUS, executeTransaction, getExplorerAddressUrl } from '@/services/blockchain/transactionService'
import { contractConfig, getMissingContractConfig, isContractConfigured } from '@/config/contractConfig'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { TransactionStatus } from '@/components/wallet/TransactionStatus'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { escrowStatus } from '@/constants'
import { formatCurrency, formatDate, shortAddress } from '@/utils/format'
import { cn } from '@/utils/cn'

// Shown only until the real fee (feeBps) is read from the contract.
const PLATFORM_FEE_RATE = 0.05

/** wei -> "0.525" (max 6 decimals, trailing zeros trimmed). Display only. */
function formatEth(wei) {
  if (wei === null || wei === undefined) return '—'
  const text = Number(formatEther(wei)).toFixed(6).replace(/\.?0+$/, '')
  return `${text || '0'} ETH`
}

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

  // Real numbers from the contract: quote, policy and this wallet's escrow for this project.
  const chainReady = configured && wallet.isConnected && !wallet.isWrongNetwork
  const { data: chain, error: chainError, refresh: refreshChain } = useAsync(async () => {
    if (!chainReady || !project) return null
    const amountWei = contractConfig.thbPerEth ? contractService.thbToWei(project.budget, contractConfig.thbPerEth) : null
    const escrowId = contractService.getEscrowId({ clientAddress: wallet.address, projectId: project.id })
    const [quote, policy, onChain] = await Promise.all([
      amountWei ? contractService.quote(amountWei) : null,
      contractService.readPolicy(),
      contractService.readEscrow({ escrowId }),
    ])
    return { amountWei, escrowId, quote, policy, onChain }
  }, [chainReady, wallet.address, wallet.chainId, project?.id, project?.budget])
  const [freelancerInput, setFreelancerInput] = useState('')

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
  const feeRate = chain?.policy ? chain.policy.feeBps / 10000 : PLATFORM_FEE_RATE
  const fee = Math.round(project.budget * feeRate)
  const total = project.budget + fee
  const funded = project.escrowStatus !== 'unfunded'

  // Wallet that will receive the pay. TODO(team): bind a wallet to each freelancer profile
  // (FRONTEND_REVIEW_TH.md item 7); until then the client enters it and must double-check it.
  const freelancerAddress = freelancerInput.trim() || project.freelancerWalletAddress || ''
  const freelancerAddressValid = isAddress(freelancerAddress)
  const onChain = chain?.onChain
  const canRelease = Boolean(onChain && ['active', 'submitted'].includes(onChain.statusName))

  const fail = (title, message) => {
    setTx({ status: TX_STATUS.FAILED, hash: null, error: message })
    toast.warning(title, message)
  }

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
      return fail('Smart Contract ยังไม่พร้อม', `ยังไม่สามารถฝากเงินได้: ขาด ${missing.join(', ')}`)
    }
    if (!contractConfig.thbPerEth) {
      return fail('ยังไม่มีอัตราแลกเปลี่ยน', 'ยังไม่สามารถแปลงบาทเป็น ETH ได้: ขาด VITE_THB_PER_ETH')
    }
    if (wallet.isWrongNetwork) {
      return fail('Wallet อยู่คนละ Network', `กรุณาสลับไป ${contractConfig.chainName} ก่อนฝากเงิน`)
    }
    if (!freelancerAddressValid) {
      return fail('ยังไม่มี wallet ของ freelancer', 'กรอก address wallet ที่ freelancer ใช้รับเงินให้ถูกต้องก่อน')
    }
    if (onChain) {
      return fail('ฝากเงินแล้ว', 'โปรเจกต์นี้มี escrow บน blockchain จาก wallet นี้อยู่แล้ว')
    }

    setBusy(true)
    try {
      const result = await executeTransaction(
        () =>
          contractService.depositEscrow({
            projectId: project.id,
            freelancerAddress,
            deadline: contractService.buildDeadline(project),
            termsHash: contractService.buildTermsHash(project),
            amountWei: contractService.thbToWei(project.budget, contractConfig.thbPerEth),
          }),
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
        refreshChain()
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
      return fail('Smart Contract ยังไม่พร้อม', `ยังไม่สามารถปล่อยเงินได้: ขาด ${missing.join(', ')}`)
    }
    let clientAddress = wallet.address
    if (!wallet.isConnected) {
      try {
        clientAddress = (await wallet.connect()).address
      } catch {
        return
      }
    }
    setBusy(true)
    try {
      const result = await executeTransaction(
        () =>
          contractService.releasePayment({
            escrowId: contractService.getEscrowId({ clientAddress, projectId: project.id }),
          }),
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
        refreshChain()
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
                  <span>
                    {formatCurrency(project.budget)}
                    {chain?.amountWei ? ` · ${formatEth(chain.amountWei)}` : ''}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-ink-500">
                  <span>
                    ค่าธรรมเนียมแพลตฟอร์ม (
                    {chain?.policy ? `${chain.policy.feeBps / 100}%` : `${PLATFORM_FEE_RATE * 100}% · ประมาณการ`})
                  </span>
                  <span>
                    {formatCurrency(fee)}
                    {chain?.quote ? ` · ${formatEth(chain.quote.fee)}` : ''}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-ink/[0.06] pt-2 text-sm font-bold text-ink">
                  <span>ยอดรวมที่ต้องฝาก</span>
                  <span>
                    {formatCurrency(total)}
                    {chain?.quote ? ` · ${formatEth(chain.quote.total)}` : ''}
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
                  {contractConfig.thbPerEth
                    ? `ฝากเป็น ETH ในอัตรา ${formatCurrency(contractConfig.thbPerEth)} ต่อ 1 ETH (อัตราคงที่จากการตั้งค่า ไม่ใช่ราคาตลาด) ยอดที่ตัดจริงคือยอดจาก Smart Contract ที่แสดงข้างบน`
                    : 'ยังไม่ได้ตั้งอัตราแลกเปลี่ยนบาท/ETH จึงยังฝากไม่ได้'}
                  {chainError ? ` · อ่านข้อมูลจาก Contract ไม่สำเร็จ: ${chainError.message}` : ''}
                </p>
              </div>

              {!onChain && (
                <div className="mt-4">
                  <label htmlFor="freelancer-wallet" className="field-label">
                    Wallet ของ freelancer (ที่รับเงิน)
                  </label>
                  <input
                    id="freelancer-wallet"
                    value={freelancerInput || project.freelancerWalletAddress || ''}
                    onChange={(event) => setFreelancerInput(event.target.value)}
                    placeholder="0x…"
                    spellCheck={false}
                    autoComplete="off"
                    className={cn(
                      'field-control font-mono text-[12px]',
                      freelancerAddress && !freelancerAddressValid && 'field-error',
                    )}
                  />
                  <p
                    className={cn(
                      'mt-1 text-[10.5px]',
                      freelancerAddress && !freelancerAddressValid ? 'text-rose-600' : 'text-ink-400',
                    )}
                  >
                    {freelancerAddress && !freelancerAddressValid
                      ? 'address ไม่ถูกต้อง'
                      : 'ตรวจให้แน่ใจว่าถูกต้อง เงินจะไปที่ address นี้เมื่อปล่อยเงิน (ระบบยังไม่ผูก wallet กับโปรไฟล์ freelancer)'}
                  </p>
                </div>
              )}

              {wallet.isWrongNetwork && (
                <InfoBanner tone="danger" className="mt-4" title="Wallet อยู่คนละ Network">
                  ต้องใช้ {contractConfig.chainName} (Chain {contractConfig.chainId}) จึงจะฝากหรือปล่อยเงินได้{' '}
                  <button type="button" onClick={wallet.switchNetwork} className="font-semibold text-brand-700 underline">
                    สลับ Network
                  </button>
                </InfoBanner>
              )}

              {onChain && (
                <InfoBanner tone="info" className="mt-4" title={`สถานะบน blockchain: ${onChain.statusName}`}>
                  escrow ของ wallet {shortAddress(wallet.address)} สำหรับโครงการนี้ ฝากไว้ {formatEth(onChain.amount)} + ค่าธรรมเนียม{' '}
                  {formatEth(onChain.fee)} · ผู้รับ {shortAddress(onChain.freelancer)} · ขอแก้งานแล้ว {onChain.revisionCount} ครั้ง
                  <br />
                  ข้อมูลของโครงการในหน้านี้ยังเป็นข้อมูลจำลอง จึงอาจยังแสดงว่ายังไม่ฝากเงิน
                </InfoBanner>
              )}

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
                  {canRelease && (
                    <Button variant="secondary" size="md" onClick={handleRelease} loading={busy}>
                      ปล่อยเงินให้ freelancer
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
            {getExplorerAddressUrl(contractConfig.contractAddress) && (
              <a
                href={getExplorerAddressUrl(contractConfig.contractAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-700 hover:underline"
              >
                ดู Smart Contract บน Block Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
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
