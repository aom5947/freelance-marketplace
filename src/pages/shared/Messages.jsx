import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Search, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { messageService } from '@/services/api/messageService'
import { PageHeader } from '@/components/common/PageHeader'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageLoader } from '@/components/common/LoadingSkeleton'
import { InfoBanner } from '@/components/common/InfoBanner'
import { formatDate, timeAgo } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function Messages() {
  useDocumentTitle('ข้อความ')
  const { role, profileId } = useAuth()
  const { threadId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const bottomRef = useRef(null)

  const { data, loading, error, refresh, setData } = useAsync(
    () => messageService.listThreads({ role, profileId }),
    [role, profileId],
  )

  const threads = data || []
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const active = useMemo(
    () => threads.find((thread) => thread.id === threadId) || (isMobile ? null : threads[0]),
    [threads, threadId, isMobile],
  )

  const filtered = threads.filter((thread) =>
    (thread.other?.name || '').toLowerCase().includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    if (!active?.unread) return
    setData((current) =>
      (current || []).map((thread) => (thread.id === active.id ? { ...thread, unread: false } : thread)),
    )
    messageService.markRead({ threadId: active.id, role }).catch(() => {})
  }, [active?.id, active?.unread, role, setData])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [active?.id, active?.messages?.length])

  const send = async (event) => {
    event.preventDefault()
    const value = text.trim()
    if (!value || !active) return
    setSending(true)
    try {
      const result = await messageService.send({ threadId: active.id, role, text: value })
      setData((current) =>
        (current || []).map((thread) => (thread.id === active.id ? result.thread : thread)),
      )
      setText('')
    } catch (err) {
      toast.error('ส่งข้อความไม่สำเร็จ', err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <PageLoader />
  if (error) return <ErrorState error={error} onRetry={refresh} />

  return (
    <div>
      <div className={cn(isMobile && threadId && 'hidden')}>
        <PageHeader
          eyebrow="Messages"
          title="ข้อความ"
          description="พูดคุยรายละเอียดงานกับลูกค้าหรือฟรีแลนซ์ — ข้อความเป็นข้อมูลจำลอง"
        />
        <InfoBanner tone="warning" className="mb-5" title="Mock messaging">
          ข้อความถูกเก็บใน mock database ยังไม่มีการส่งแบบ realtime หรือแจ้งเตือนภายนอก
        </InfoBanner>
      </div>

      {threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="ยังไม่มีบทสนทนา"
          description="เมื่อคุณเริ่มคุยกับลูกค้าหรือฟรีแลนซ์ บทสนทนาจะแสดงที่นี่"
          action={
            role === 'client' ? (
              <Button to="/freelancers" variant="secondary">
                ค้นหาฟรีแลนซ์
              </Button>
            ) : (
              <Button to="/freelancer/jobs" variant="secondary">
                ค้นหางาน
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
          <div className="grid md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
            <div
              className={cn(
                'border-r border-ink/[0.06]',
                isMobile && threadId && 'hidden',
              )}
            >
              <div className="border-b border-ink/[0.06] p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาบทสนทนา…"
                    className="h-9 w-full rounded-lg border border-ink/10 bg-paper-soft pl-9 pr-3 text-xs text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
                    aria-label="ค้นหาบทสนทนา"
                  />
                </div>
              </div>

              <ul className="max-h-[560px] divide-y divide-ink/[0.05] overflow-y-auto scrollbar-thin">
                {filtered.map((thread) => {
                  const isActive = active?.id === thread.id
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/messages/${thread.id}`)}
                        className={cn(
                          'flex w-full items-start gap-2.5 px-3.5 py-3.5 text-left transition',
                          isActive ? 'bg-brand-50/70' : 'hover:bg-paper-soft',
                        )}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        <Avatar
                          name={thread.other?.name || 'User'}
                          color={thread.other?.avatarColor}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12px] font-bold text-ink">
                              {thread.other?.name}
                            </p>
                            <span className="shrink-0 text-[9px] text-ink-400">
                              {timeAgo(thread.lastMessage?.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[10.5px] text-ink-500">
                            {thread.lastMessage?.senderRole === role ? 'คุณ: ' : ''}
                            {thread.lastMessage?.text}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {thread.project && (
                              <span className="truncate rounded-full bg-white px-1.5 py-0.5 text-[8.5px] font-medium text-ink-500 ring-1 ring-ink/[0.06]">
                                {thread.project.title}
                              </span>
                            )}
                            {thread.unread && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
                {filtered.length === 0 && (
                  <li className="px-4 py-8 text-center text-[11px] text-ink-400">ไม่พบบทสนทนา</li>
                )}
              </ul>
            </div>

            <div className={cn('flex min-h-[560px] flex-col', isMobile && !threadId && 'hidden')}>
              {active ? (
                <>
                  <div className="flex items-center gap-2.5 border-b border-ink/[0.06] px-4 py-3">
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => navigate('/messages')}
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-paper"
                        aria-label="กลับไปรายการบทสนทนา"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <Avatar
                      name={active.other?.name || 'User'}
                      color={active.other?.avatarColor}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink">{active.other?.name}</p>
                      <p className="truncate text-[10px] text-ink-400">
                        {active.other?.title || active.other?.contactName}
                      </p>
                    </div>
                    {active.project && (
                      <Link
                        to={
                          role === 'client'
                            ? `/client/projects/${active.project.id}`
                            : `/freelancer/projects/${active.project.id}`
                        }
                        className="hidden truncate rounded-full bg-paper px-2.5 py-1 text-[10px] font-medium text-ink-600 transition hover:text-brand-700 sm:block"
                      >
                        {active.project.title}
                      </Link>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-paper-soft/40 px-4 py-4 scrollbar-thin">
                    {(active.messages || []).map((message) => {
                      const mine = message.senderRole === role
                      return (
                        <div
                          key={message.id}
                          className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                        >
                          <div className={cn('max-w-[78%]', mine ? 'items-end' : 'items-start')}>
                            <div
                              className={cn(
                                'rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed',
                                mine
                                  ? 'rounded-br-md bg-ink text-white'
                                  : 'rounded-bl-md border border-ink/[0.06] bg-white text-ink-700',
                              )}
                            >
                              {message.text}
                            </div>
                            <p className={cn('mt-1 text-[9px] text-ink-400', mine ? 'text-right' : 'text-left')}>
                              {formatDate(message.createdAt, { year: undefined })} ·{' '}
                              {new Date(message.createdAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <form onSubmit={send} className="flex items-center gap-2 border-t border-ink/[0.06] p-3">
                    <label htmlFor="message-input" className="sr-only">
                      พิมพ์ข้อความ
                    </label>
                    <input
                      id="message-input"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="พิมพ์ข้อความ…"
                      className="h-10 flex-1 rounded-xl border border-ink/10 bg-white px-3.5 text-xs text-ink placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                    <Button
                      type="submit"
                      variant="brand"
                      size="md"
                      icon={Send}
                      loading={sending}
                      disabled={!text.trim()}
                    >
                      ส่ง
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <MessageSquare className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-ink">เลือกบทสนทนา</p>
                  <p className="mt-1 max-w-xs text-[11.5px] text-ink-500">
                    เลือกบทสนทนาจากรายการด้านซ้ายเพื่อดูข้อความ
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
