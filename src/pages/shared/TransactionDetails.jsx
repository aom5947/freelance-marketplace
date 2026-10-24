import { useParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Info,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { transactionService } from '@/services/api/transactionService'
import { getExplorerTxUrl } from '@/services/blockchain/transactionService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { transactionStatus, transactionTypes } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

const directionMap = {
  earning: 'in',
  refund: 'in',
  escrow_deposit: 'out',
  withdrawal: 'out',
  fee: 'out',
  release: 'out',
}

export default function TransactionDetails() {
  const { transactionId } = useParams()
  const { role } = useAuth()
  const { data: transaction, loading, error, refresh } = useAsync(
    () => transactionService.getById(transactionId),
    [transactionId],
  )
  useDocumentTitle('รายละเอียดธุรกรรม')

  if (loading) return <PageLoader />
  if (error || !transaction) return <ErrorState error={error} onRetry={refresh} />

  const status = transactionStatus[transaction.status]
  const direction = directionMap[transaction.type] || 'out'
  const explorerUrl = transaction.hash ? getExplorerTxUrl(transaction.hash) : null
  const isMock = transaction.isMock || !transaction.hash

  const StatusIcon =
    transaction.status === 'confirmed' ? CheckCircle2 : transaction.status === 'pending' ? Clock3 : XCircle

  return (
    <div>
      <PageHeader
        eyebrow="Transaction"
        title="รายละเอียดธุรกรรม"
        description={`รหัสอ้างอิง ${transaction.id}`}
        backTo="/wallet"
        backLabel="กลับไปกระเป๋าเงิน"
        actions={<StatusBadge label={status?.label} tone={status?.tone} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card p-6">
            <div className="flex flex-col items-center text-center">
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-2xl',
                  direction === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600',
                )}
              >
                {direction === 'in' ? (
                  <ArrowDownLeft className="h-6 w-6" />
                ) : (
                  <ArrowUpRight className="h-6 w-6" />
                )}
              </span>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                {transactionTypes[transaction.type] || transaction.type}
              </p>
              <p
                className={cn(
                  'mt-1 text-4xl font-extrabold tracking-tight',
                  direction === 'in' ? 'text-emerald-600' : 'text-ink',
                )}
              >
                {direction === 'in' ? '+' : '−'}
                {formatCurrency(transaction.amount)}
              </p>
              <div className="mt-2">
                <StatusBadge label={status?.label} tone={status?.tone} />
              </div>
              <p className="mt-2 text-[11px] text-ink-500">{formatDate(transaction.createdAt, { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div className="mt-6 space-y-2.5 border-t border-ink/[0.07] pt-4 text-[11.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">ประเภทรายการ</span>
                <span className="font-semibold text-ink">
                  {transactionTypes[transaction.type] || transaction.type}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">โครงการ</span>
                <span className="max-w-[220px] truncate text-right font-semibold text-ink">
                  {transaction.projectId ? `#${transaction.projectId}` : 'ไม่ผูกกับโครงการ'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">สถานะ</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status?.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">บันทึกใน</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[9.5px] font-bold',
                    isMock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                  )}
                >
                  {isMock ? 'MOCK LEDGER' : 'BLOCKCHAIN'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">Note</span>
                <span className="text-right text-ink-600">{transaction.note}</span>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <FileText className="h-4 w-4 text-brand-600" />
              ข้อมูลบน Blockchain
            </h2>

            {transaction.hash ? (
              <div className="mt-3 space-y-2.5 text-[11.5px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-500">Transaction hash</span>
                  <span className="break-all text-right font-mono text-[10px] text-ink">{transaction.hash}</span>
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 hover:underline"
                  >
                    เปิดใน Block Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <InfoBanner tone="warning" className="mt-3" title="ไม่มี transaction hash">
                รายการนี้เป็นข้อมูลจำลอง ไม่ได้เกิดขึ้นบน blockchain จึงไม่มี hash หรือ block number
                ให้ตรวจสอบ — hash จะแสดงเฉพาะธุรกรรมจริงที่ยืนยันจาก Wallet เท่านั้น
              </InfoBanner>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold">ลำดับเหตุการณ์</h2>
            <ol className="mt-4 space-y-0">
              {[
                { label: 'สร้างรายการ', done: true, time: formatDate(transaction.createdAt) },
                {
                  label: transaction.status === 'pending' ? 'รอดำเนินการ' : 'ดำเนินการแล้ว',
                  done: transaction.status !== 'pending',
                  time: transaction.status === 'pending' ? 'รอการอนุมัติ' : 'mock ledger',
                },
                {
                  label: transaction.status === 'confirmed' ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน',
                  done: transaction.status === 'confirmed',
                  time: transaction.status === 'confirmed' ? 'ยืนยันใน mock ledger' : '—',
                },
              ].map((step, index, list) => (
                <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
                  {index < list.length - 1 && (
                    <span className="absolute left-[11px] top-6 h-full w-px bg-ink/[0.08]" aria-hidden="true" />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                      step.done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : 'border-ink/10 bg-white text-ink-300',
                    )}
                  >
                    {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{step.label}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-400">{step.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold">การเชื่อมต่อ</h2>
            <ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-ink-500">
              <li className="flex items-start gap-2">
                <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                สถานะกระเป๋าเงิน: ตรวจสอบได้ที่หน้ากระเป๋าเงิน
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                ธุรกรรมนี้ยังไม่ผูกกับ Smart Contract
              </li>
              <li className="flex items-start gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                เมื่อเชื่อมต่อ contract แล้ว รายการจริงจะมี hash และ explorer link
              </li>
            </ul>
            <Button to="/wallet" variant="secondary" size="sm" className="mt-4 w-full">
              ไปที่กระเป๋าเงิน
            </Button>
            {transaction.projectId && (
              <Button
                to={`/${role === 'freelancer' ? 'freelancer' : 'client'}/projects/${transaction.projectId}`}
                variant="ghost"
                size="sm"
                className="mt-1.5 w-full"
              >
                ดูโครงการที่เกี่ยวข้อง
              </Button>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold">ผู้เกี่ยวข้อง</h2>
            <p className="mt-2 text-[11.5px] text-ink-500">
              {transaction.userId === 'u-freelancer'
                ? 'บัญชีฟรีแลนซ์ (คุณ)'
                : 'บัญชีลูกค้า (คุณ)'}
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink-400">{transaction.userId}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
