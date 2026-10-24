import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, TrendingUp, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { transactionService } from '@/services/api/transactionService'
import { projectService } from '@/services/api/projectService'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Input } from '@/components/common/FormField'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { transactionStatus, transactionTypes } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function Earnings() {
  useDocumentTitle('รายได้')
  const { user, profileId } = useAuth()
  const toast = useToast()
  const { data, loading, error, refresh } = useAsync(
    () => transactionService.list(user?.id),
    [user?.id],
  )
  const { data: projects } = useAsync(
    () => projectService.listProjects({ role: 'freelancer', profileId }),
    [profileId],
  )

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState('')
  const [busy, setBusy] = useState(false)

  const transactions = data || []
  const projectList = projects || []

  const stats = useMemo(() => {
    const earnings = transactions
      .filter((tx) => tx.type === 'earning' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const fees = transactions
      .filter((tx) => tx.type === 'fee')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const withdrawals = transactions.filter((tx) => tx.type === 'withdrawal')
    const withdrawn = withdrawals
      .filter((tx) => tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const pendingWithdrawal = withdrawals
      .filter((tx) => tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount, 0)
    const inEscrow = projectList
      .filter((project) => project.escrowStatus === 'funded')
      .reduce((sum, project) => sum + (project.escrowAmount - project.releasedAmount), 0)
    return {
      earnings,
      fees,
      withdrawn,
      pendingWithdrawal,
      inEscrow,
      available: Math.max(0, earnings - withdrawn - pendingWithdrawal),
    }
  }, [transactions, projectList])

  const monthly = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('th-TH', { month: 'short' })
    const now = new Date()
    const buckets = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatter.format(date),
        total: 0,
      }
    })
    transactions
      .filter((tx) => tx.type === 'earning' && tx.status === 'confirmed')
      .forEach((tx) => {
        const date = new Date(tx.createdAt)
        const bucket = buckets.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`)
        if (bucket) bucket.total += tx.amount
      })
    const max = Math.max(1, ...buckets.map((bucket) => bucket.total))
    return { buckets, max }
  }, [transactions])

  const submitWithdrawal = async () => {
    const value = Number(amount)
    if (!value || value <= 0) {
      setAmountError('กรุณากรอกจำนวนเงินมากกว่า 0')
      return
    }
    if (value > stats.available) {
      setAmountError(`ถอนได้สูงสุด ${formatCurrency(stats.available)}`)
      return
    }
    setBusy(true)
    try {
      await transactionService.requestWithdrawal(user.id, value)
      toast.success(
        'บันทึกคำขอถอนแล้ว (Mock)',
        'คำขอถูกเพิ่มใน mock ledger — ยังไม่มีการโอนเงินจริงและต้องรอระบบ Backend/Wallet',
      )
      setWithdrawOpen(false)
      setAmount('')
      refresh()
    } catch (err) {
      toast.error('ส่งคำขอไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Earnings"
        title="รายได้ของฉัน"
        description="ยอดรายได้ที่ยืนยันแล้ว เงินใน escrow และประวัติการถอน"
        actions={
          <Button
            variant="brand"
            size="md"
            icon={ArrowDownToLine}
            onClick={() => {
              setAmount('')
              setAmountError('')
              setWithdrawOpen(true)
            }}
          >
            ขอถอนเงิน
          </Button>
        }
      />

      <InfoBanner tone="warning" className="mb-5" title="ข้อมูลรายได้จำลอง">
        ตัวเลขทั้งหมดในหน้านี้เป็น mock ledger — ไม่มีการโอนเงินจริง
        การถอนจะถูกบันทึกเป็นคำขอตัวอย่างเท่านั้น
      </InfoBanner>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="รายได้ทั้งหมด"
          value={loading ? '—' : formatCurrency(stats.earnings)}
          hint={`ค่าธรรมเนียม ${formatCurrency(stats.fees)}`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="ถอนได้ตอนนี้"
          value={loading ? '—' : formatCurrency(stats.available)}
          hint="หลังหักคำขอที่รอดำเนินการ"
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="รอปล่อยจาก Escrow"
          value={formatCurrency(stats.inEscrow)}
          hint="จะพร้อมเมื่อลูกค้าอนุมัติ"
          icon={Wallet}
          tone="blue"
        />
        <StatCard
          label="รอถอน / ถอนแล้ว"
          value={`${formatCurrency(stats.pendingWithdrawal, { compact: true })} / ${formatCurrency(stats.withdrawn, { compact: true })}`}
          hint="สถานะจาก mock ledger"
          icon={ArrowDownToLine}
          tone="violet"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">รายได้ 6 เดือนล่าสุด</h2>
            <span className="text-[10px] text-ink-400">mock data</span>
          </div>
          <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">
            {monthly.buckets.map((bucket) => {
              const height = Math.round((bucket.total / monthly.max) * 100)
              return (
                <div key={bucket.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[9px] font-semibold text-ink-500">
                    {bucket.total > 0 ? formatCurrency(bucket.total, { compact: true }) : ''}
                  </span>
                  <div className="flex h-32 w-full items-end rounded-lg bg-paper">
                    <div
                      className={cn(
                        'w-full rounded-lg bg-gradient-to-t from-brand-600 to-violet-400 transition-all duration-700',
                        bucket.total === 0 && 'bg-ink/[0.06]',
                      )}
                      style={{ height: `${Math.max(bucket.total > 0 ? 8 : 2, height)}%` }}
                      title={`${bucket.label}: ${formatCurrency(bucket.total)}`}
                    />
                  </div>
                  <span className="text-[10px] text-ink-400">{bucket.label}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-bold">กระเป๋าเงิน</h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
            เชื่อมต่อ Wallet เพื่อเตรียมรับเงินจริงเมื่อระบบ Smart Contract พร้อม
          </p>
          <WalletConnectButton size="md" className="mt-3" />
          <div className="mt-4 space-y-2 border-t border-ink/[0.06] pt-3 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">รายได้ยืนยันแล้ว</span>
              <span className="font-semibold text-ink">{formatCurrency(stats.earnings)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">รอถอน</span>
              <span className="font-semibold text-amber-600">{formatCurrency(stats.pendingWithdrawal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">ถอนแล้ว</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(stats.withdrawn)}</span>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[10px] leading-relaxed text-ink-400">
            การถอนเงินจริงจะต้องมีการยืนยันจาก Wallet และ Smart Contract
            — ขณะนี้คำขอถูกบันทึกเป็นข้อมูลจำลองเท่านั้น
          </p>
        </section>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">รายการล่าสุด</h2>
          <Link to="/freelancer/transactions" className="text-[11.5px] font-semibold text-brand-700 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="ยังไม่มีรายการรายได้"
            description="เมื่อคุณทำงานเสร็จและลูกค้าอนุมัติ รายได้จะแสดงที่นี่"
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[1.5fr_1.2fr_1fr_0.9fr] gap-4 border-b border-ink/[0.06] bg-paper-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:grid">
              <span>รายการ</span>
              <span>ประเภท</span>
              <span>จำนวน</span>
              <span>สถานะ</span>
            </div>
            <ul className="divide-y divide-ink/[0.06]">
              {transactions.slice(0, 6).map((tx) => {
                const status = transactionStatus[tx.status]
                return (
                  <li key={tx.id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[1.5fr_1.2fr_1fr_0.9fr] sm:items-center sm:gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{tx.note}</p>
                      <p className="mt-0.5 text-[10px] text-ink-400">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-[11px] text-ink-500">{transactionTypes[tx.type] || tx.type}</div>
                    <div className="text-[12px] font-bold text-ink">{formatCurrency(tx.amount)}</div>
                    <div>
                      <StatusBadge label={status?.label} tone={status?.tone} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="ขอถอนเงิน"
        description={`ยอดที่ถอนได้: ${formatCurrency(stats.available)} (mock)`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button variant="brand" onClick={submitWithdrawal} loading={busy}>
              ส่งคำขอถอน
            </Button>
          </>
        }
      >
        <Input
          label="จำนวนเงิน (บาท)"
          type="number"
          min="1"
          max={stats.available}
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setAmountError('')
          }}
          error={amountError}
          placeholder="15000"
          required
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[1000, 5000, 10000].map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setAmount(String(quick))}
              className="rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600 transition hover:border-brand-300"
            >
              ฿{quick.toLocaleString('th-TH')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount(String(stats.available))}
            className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            ทั้งหมด
          </button>
        </div>

        <InfoBanner tone="warning" className="mt-4" title="ยังไม่ใช่การถอนจริง">
          คำขอนี้จะถูกบันทึกใน mock ledger เพื่อทดสอบ UI การโอนเงินจริงจะต้องเชื่อมต่อระบบ Backend
          และ/หรือ Smart Contract ตามที่ทีมกำหนด
        </InfoBanner>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium text-ink-500">Wallet สำหรับรับเงิน</p>
          <WalletConnectButton size="sm" />
        </div>
      </Modal>
    </div>
  )
}
