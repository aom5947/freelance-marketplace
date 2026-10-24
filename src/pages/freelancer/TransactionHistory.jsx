import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, Receipt, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { transactionService } from '@/services/api/transactionService'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/common/Button'
import { Select } from '@/components/common/FormField'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { Pagination } from '@/components/common/Pagination'
import { transactionStatus, transactionTypes } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'

const PAGE_SIZE = 8

export default function TransactionHistory() {
  useDocumentTitle('ประวัติธุรกรรม')
  const { user } = useAuth()
  const { data, loading, error, refresh } = useAsync(
    () => transactionService.list(user?.id),
    [user?.id],
  )
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data || []).filter((tx) => {
      if (type && tx.type !== type) return false
      if (status && tx.status !== status) return false
      if (term && !`${tx.note} ${tx.id} ${tx.hash || ''}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [data, query, type, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="ประวัติธุรกรรม"
        description="รายการฝาก escrow รายได้ ค่าธรรมเนียม และคำขอถอนเงินทั้งหมดของคุณ"
        actions={
          <>
            <Button to="/wallet" variant="secondary" size="md">
              กระเป๋าเงิน
            </Button>
            <Button to="/freelancer/earnings" variant="brand" size="md" icon={ArrowDownToLine}>
              ขอถอนเงิน
            </Button>
          </>
        }
      />

      <InfoBanner tone="warning" className="mb-5" title="Mock ledger">
        ทุกรายการเป็นข้อมูลจำลอง ไม่มี transaction hash จริง และไม่มีการโอนเงินบน blockchain
      </InfoBanner>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="ค้นหารายละเอียดหรือรหัสธุรกรรม…"
            className="h-10 w-full rounded-xl border border-ink/10 bg-white pl-9 pr-3 text-xs text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            aria-label="ค้นหาธุรกรรม"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-80">
          <Select
            aria-label="กรองตามประเภท"
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setPage(1)
            }}
          >
            <option value="">ทุกประเภท</option>
            {Object.entries(transactionTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="กรองตามสถานะ"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(transactionStatus).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="ไม่พบธุรกรรม"
          description={
            query || type || status
              ? 'ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น'
              : 'เมื่อมีรายได้หรือคำขอถอน รายการจะแสดงที่นี่'
          }
          action={
            query || type || status ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setType('')
                  setStatus('')
                }}
              >
                ล้างตัวกรอง
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[0.9fr_1.6fr_1.1fr_0.9fr_1fr_0.7fr] gap-3 border-b border-ink/[0.06] bg-paper-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400 md:grid">
              <span>วันที่</span>
              <span>รายการ</span>
              <span>ประเภท</span>
              <span>จำนวน</span>
              <span>สถานะ</span>
              <span className="text-right">รหัส</span>
            </div>
            <ul className="divide-y divide-ink/[0.06]">
              {visible.map((tx) => {
                const txStatus = transactionStatus[tx.status]
                return (
                  <li
                    key={tx.id}
                    className="grid gap-2 px-5 py-3.5 transition hover:bg-paper-soft/50 md:grid-cols-[0.9fr_1.6fr_1.1fr_0.9fr_1fr_0.7fr] md:items-center md:gap-3"
                  >
                    <span className="text-[11px] text-ink-500">{formatDate(tx.createdAt)}</span>
                    <div className="min-w-0">
                      <Link
                        to={`/transactions/${tx.id}`}
                        className="line-clamp-1 text-[12px] font-medium text-ink transition hover:text-brand-700"
                      >
                        {tx.note}
                      </Link>
                      <span className="mt-0.5 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-amber-700">
                        {tx.isMock ? 'MOCK' : 'ON-CHAIN'}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink-500">{transactionTypes[tx.type] || tx.type}</span>
                    <span className="text-[12px] font-bold text-ink">{formatCurrency(tx.amount)}</span>
                    <span>
                      <StatusBadge label={txStatus?.label} tone={txStatus?.tone} />
                    </span>
                    <span className="truncate text-right font-mono text-[9.5px] text-ink-400">
                      {tx.hash ? `${tx.hash.slice(0, 8)}…` : '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onChange={setPage}
            className="mt-6"
          />
        </>
      )}
    </div>
  )
}
