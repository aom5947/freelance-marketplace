import { useMemo, useState } from 'react'
import { FileText, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { proposalService } from '@/services/api/proposalService'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/common/Button'
import { ProposalCard } from '@/components/proposals/ProposalCard'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'

export default function MyProposals() {
  useDocumentTitle('ข้อเสนอของฉัน')
  const { profileId } = useAuth()
  const toast = useToast()
  const { data, loading, error, refresh } = useAsync(
    () => proposalService.listByFreelancer(profileId),
    [profileId],
  )
  const [tab, setTab] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const proposals = data || []
  const counts = useMemo(
    () => ({
      all: proposals.length,
      pending: proposals.filter((proposal) => proposal.status === 'pending').length,
      shortlisted: proposals.filter((proposal) => proposal.status === 'shortlisted').length,
      hired: proposals.filter((proposal) => proposal.status === 'hired').length,
      rejected: proposals.filter((proposal) => proposal.status === 'rejected').length,
      withdrawn: proposals.filter((proposal) => proposal.status === 'withdrawn').length,
    }),
    [proposals],
  )

  const filtered = proposals.filter((proposal) => tab === 'all' || proposal.status === tab)

  const withdraw = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await proposalService.withdraw(confirm.id)
      toast.success('ถอนข้อเสนอแล้ว', 'สถานะถูกอัปเดตใน mock data — ลูกค้าจะไม่เห็นข้อเสนอนี้')
      setConfirm(null)
      await refresh()
    } catch (err) {
      toast.error('ถอนข้อเสนอไม่สำเร็จ', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="My proposals"
        title="ข้อเสนอของฉัน"
        description="ติดตามสถานะข้อเสนอทุกงานที่คุณส่ง และถอนข้อเสนอเมื่อจำเป็น"
        actions={
          <Button to="/freelancer/jobs" variant="brand" size="md" icon={Send}>
            ค้นหางานใหม่
          </Button>
        }
      />

      <InfoBanner tone="warning" className="mb-5" title="Mock proposals">
        ข้อเสนอทั้งหมดถูกเก็บใน mock database ของเบราว์เซอร์ — การถอนหรือเปลี่ยนสถานะไม่มีผลกับระบบจริง
      </InfoBanner>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'all', label: 'ทั้งหมด', count: counts.all },
          { value: 'pending', label: 'รอพิจารณา', count: counts.pending },
          { value: 'shortlisted', label: 'คัดเลือก', count: counts.shortlisted },
          { value: 'hired', label: 'ได้งาน', count: counts.hired },
          { value: 'rejected', label: 'ไม่ผ่าน', count: counts.rejected },
          { value: 'withdrawn', label: 'ถอนแล้ว', count: counts.withdrawn },
        ]}
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={tab === 'all' ? 'ยังไม่มีข้อเสนอ' : 'ไม่มีข้อเสนอในสถานะนี้'}
          description={
            tab === 'all'
              ? 'เลือกงานที่ตรงกับทักษะของคุณ แล้วส่งข้อเสนอแรกเพื่อเริ่มต้น'
              : 'ลองเปลี่ยนแท็บหรือดูข้อเสนอทั้งหมด'
          }
          action={
            tab !== 'all' ? (
              <Button variant="secondary" onClick={() => setTab('all')}>
                ดูทั้งหมด
              </Button>
            ) : (
              <Button to="/freelancer/jobs" variant="brand">
                ค้นหางาน
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              showJob
              actions={
                <>
                  <Button to={`/freelancer/jobs/${proposal.jobId}`} variant="secondary" size="sm">
                    ดูรายละเอียดงาน
                  </Button>
                  {['pending', 'shortlisted'].includes(proposal.status) && (
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => setConfirm(proposal)}
                    >
                      ถอนข้อเสนอ
                    </Button>
                  )}
                  {proposal.status === 'hired' && (
                    <Button to="/freelancer/projects" variant="brand" size="sm">
                      ไปที่โครงการ
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={withdraw}
        loading={busy}
        title="ถอนข้อเสนอนี้?"
        description={
          confirm
            ? `ข้อเสนอสำหรับ “${confirm.job?.title}” ราคา ${confirm.bidAmount?.toLocaleString('th-TH')} บาท จะถูกถอนและลูกค้าจะไม่เห็นอีก — ไม่สามารถกู้คืนได้ใน mock data`
            : ''
        }
        confirmLabel="ถอนข้อเสนอ"
      />
    </div>
  )
}
