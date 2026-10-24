import { Check, Clock, ExternalLink, Loader2, X } from 'lucide-react'
import { TX_STATUS } from '@/services/blockchain/transactionService'
import { getExplorerTxUrl } from '@/services/blockchain/transactionService'
import { cn } from '@/utils/cn'

const statusConfig = {
  [TX_STATUS.IDLE]: { label: 'พร้อมทำรายการ', icon: Clock, color: 'text-ink-400 bg-ink/5' },
  [TX_STATUS.PENDING]: { label: 'กำลังรอการยืนยันจาก Network', icon: Loader2, color: 'text-amber-600 bg-amber-50', spin: true },
  [TX_STATUS.CONFIRMED]: { label: 'ยืนยันบน Blockchain แล้ว', icon: Check, color: 'text-emerald-600 bg-emerald-50' },
  [TX_STATUS.FAILED]: { label: 'ธุรกรรมไม่สำเร็จ', icon: X, color: 'text-rose-600 bg-rose-50' },
  [TX_STATUS.REJECTED]: { label: 'คุณยกเลิกใน Wallet', icon: X, color: 'text-rose-600 bg-rose-50' },
}

export function TransactionStatus({ status = TX_STATUS.IDLE, hash, error, className }) {
  const config = statusConfig[status] || statusConfig[TX_STATUS.IDLE]
  const Icon = config.icon
  const explorerUrl = getExplorerTxUrl(hash)

  return (
    <div className={cn('rounded-xl border border-ink/[0.07] bg-white p-3.5', className)} role="status">
      <div className="flex items-center gap-2.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.color)}>
          <Icon className={cn('h-4 w-4', config.spin && 'animate-spin')} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">{config.label}</p>
          {error && <p className="mt-0.5 text-[11px] text-rose-600">{error}</p>}
          {hash ? (
            explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-brand-700 hover:underline"
              >
                {hash.slice(0, 12)}…{hash.slice(-8)}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <p className="mt-0.5 truncate font-mono text-[10px] text-ink-500">{hash}</p>
            )
          ) : (
            <p className="mt-0.5 text-[10px] text-ink-400">ยังไม่มี transaction hash</p>
          )}
        </div>
      </div>
    </div>
  )
}
