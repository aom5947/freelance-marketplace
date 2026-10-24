import { useMemo, useState } from 'react'
import { HelpCircle, Mail, MessageSquare, SearchX, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchBar } from '@/components/common/SearchBar'
import { FaqAccordion } from '@/components/common/FaqAccordion'
import { InfoBanner } from '@/components/common/InfoBanner'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { Input, Select, Textarea } from '@/components/common/FormField'
import { useToast } from '@/contexts/ToastContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { validate, emailFormat, minLength, required } from '@/utils/validators'
import { faqs } from '@/data/mockData'
import { appConfig } from '@/config/appConfig'

export default function HelpPage() {
  useDocumentTitle('ช่วยเหลือ & FAQ')
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [values, setValues] = useState({ name: '', email: '', topic: 'general', message: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return faqs
    return faqs.filter((faq) =>
      `${faq.question} ${faq.answer}`.toLowerCase().includes(term),
    )
  }, [query])

  const submit = (event) => {
    event.preventDefault()
    const nextErrors = validate(values, {
      name: [required('ชื่อ'), minLength(2, 'ชื่อ')],
      email: [required('อีเมล'), emailFormat()],
      message: [required('รายละเอียด'), minLength(20, 'รายละเอียด')],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitted(true)
    toast.info(
      'ยังไม่เชื่อมต่อระบบ Ticket',
      'Frontend ตรวจสอบฟอร์มแล้ว แต่ข้อความยังไม่ถูกส่งถึงทีม — ต้องเชื่อม Backend ก่อน',
    )
  }

  return (
    <div className="pt-[72px]">
      <div className="relative border-b border-ink/[0.06] bg-white">
        <div className="surface-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-page relative py-10 sm:py-12">
          <PageHeader
            eyebrow="Help center"
            title="มีคำถาม? เรามีคำตอบ"
            description="ค้นหาคำตอบเรื่องการจ้างงาน การชำระเงิน และสถานะการเชื่อมต่อระบบในเวอร์ชันนี้"
          />
          <div className="max-w-xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="ค้นหาคำถาม เช่น escrow, google login, ค่าธรรมเนียม…"
              size="lg"
            />
          </div>
        </div>
      </div>

      <div className="container-page py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">
                คำถามที่พบบ่อย {query && `· ${filtered.length} ผลลัพธ์`}
              </h2>
              <span className="text-[11px] text-ink-400">ทั้งหมด {faqs.length} คำถาม</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="ไม่พบคำตอบที่ตรงกับคำค้น"
                description="ลองใช้คำที่สั้นลง หรือดูคำถามทั้งหมดอีกครั้ง"
                action={
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    ล้างคำค้นหา
                  </Button>
                }
              />
            ) : (
              <FaqAccordion items={filtered} defaultOpen={filtered[0]?.id} />
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Escrow safety', text: 'เงินถูกคุ้มครองจนกว่าจะตรวจรับงาน' },
                { icon: MessageSquare, title: 'คุยกับฟรีแลนซ์', text: 'ใช้หน้าข้อความเพื่อตกลงรายละเอียด' },
                { icon: HelpCircle, title: 'สถานะระบบ', text: 'Mock data — ยังไม่เชื่อม Backend' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-xl border border-ink/[0.07] bg-white p-4">
                    <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    <p className="mt-2 text-xs font-bold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <form onSubmit={submit} className="card p-5" noValidate>
              <h2 className="text-base font-bold">ติดต่อทีม Freelink</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">
                กรอกข้อมูลเพื่อทดสอบฟอร์ม — ยังไม่มีการส่งอีเมลหรือสร้าง ticket จริง
              </p>

              <div className="mt-4 space-y-3">
                <Input
                  label="ชื่อ"
                  value={values.name}
                  onChange={(event) => setValues({ ...values, name: event.target.value })}
                  error={errors.name}
                  placeholder="ชื่อของคุณ"
                  required
                />
                <Input
                  label="อีเมล"
                  type="email"
                  value={values.email}
                  onChange={(event) => setValues({ ...values, email: event.target.value })}
                  error={errors.email}
                  placeholder="you@example.com"
                  required
                />
                <Select
                  label="หัวข้อ"
                  value={values.topic}
                  onChange={(event) => setValues({ ...values, topic: event.target.value })}
                >
                  <option value="general">คำถามทั่วไป</option>
                  <option value="payment">การชำระเงิน / Escrow</option>
                  <option value="account">บัญชีและการเข้าสู่ระบบ</option>
                  <option value="report">รายงานปัญหา</option>
                </Select>
                <Textarea
                  label="รายละเอียด"
                  rows={4}
                  value={values.message}
                  onChange={(event) => setValues({ ...values, message: event.target.value })}
                  error={errors.message}
                  placeholder="อธิบายสิ่งที่ต้องการความช่วยเหลือ (อย่างน้อย 20 ตัวอักษร)"
                  required
                />
                <Button type="submit" variant="brand" size="md" className="w-full" icon={Mail}>
                  ส่งข้อความ
                </Button>
              </div>

              {submitted && (
                <InfoBanner tone="warning" className="mt-3" title="ยังไม่ได้ส่งข้อความ">
                  ฟอร์มผ่านการตรวจสอบแล้ว แต่ระบบ ticket ยังไม่เชื่อมต่อ — กรุณาติดต่อ{' '}
                  {appConfig.supportEmail} โดยตรงเมื่อระบบพร้อม
                </InfoBanner>
              )}
            </form>

            <div className="card p-5">
              <h2 className="text-sm font-bold">ช่องทางอื่น</h2>
              <ul className="mt-3 space-y-2.5 text-[11.5px] text-ink-600">
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-brand-600" />
                  {appConfig.supportEmail} (ตัวอย่าง)
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-brand-600" />
                  แชทภายในแพลตฟอร์ม (Mock)
                </li>
                <li className="flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-brand-600" />
                  เวลาตอบกลับโดยประมาณ: 1–2 วันทำการ
                </li>
              </ul>
            </div>

            <InfoBanner tone="info" title="หมายเหตุการพัฒนา">
              หน้านี้เป็นส่วนหนึ่งของ Frontend demo — ข้อมูล FAQ และช่องทางติดต่อเป็นข้อมูลจำลอง
            </InfoBanner>
          </aside>
        </div>
      </div>
    </div>
  )
}
