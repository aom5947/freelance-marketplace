import {
  BarChart3,
  Bell,
  Briefcase,
  ClipboardList,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Palette,
  PenLine,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  Video,
  Wallet,
} from 'lucide-react'

export const categories = [
  {
    id: 'design',
    label: 'ออกแบบ & UX/UI',
    description: 'Product design, Design System, Brand',
    icon: Palette,
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    id: 'development',
    label: 'พัฒนาเว็บ & แอป',
    description: 'Frontend, Backend, Mobile',
    icon: Briefcase,
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'writing',
    label: 'เขียนเนื้อหา',
    description: 'Copywriting, บทความ, Translation',
    icon: PenLine,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    id: 'marketing',
    label: 'การตลาด',
    description: 'Performance, SEO, Social',
    icon: Megaphone,
    accent: 'from-rose-500 to-pink-500',
  },
  {
    id: 'video',
    label: 'วิดีโอ & Motion',
    description: 'Motion graphics, Editing, 3D',
    icon: Video,
    accent: 'from-fuchsia-500 to-purple-500',
  },
  {
    id: 'data',
    label: 'ข้อมูล & วิเคราะห์',
    description: 'Dashboard, Data analysis, BI',
    icon: BarChart3,
    accent: 'from-emerald-500 to-teal-500',
  },
]

export const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category]))

export const jobStatus = {
  open: { label: 'เปิดรับข้อเสนอ', tone: 'emerald' },
  in_progress: { label: 'กำลังดำเนินการ', tone: 'blue' },
  closed: { label: 'ปิดรับแล้ว', tone: 'slate' },
  draft: { label: 'ฉบับร่าง', tone: 'amber' },
}

export const proposalStatus = {
  pending: { label: 'รอพิจารณา', tone: 'amber' },
  shortlisted: { label: 'ผ่านการคัดเลือก', tone: 'blue' },
  hired: { label: 'ได้รับงาน', tone: 'emerald' },
  rejected: { label: 'ไม่ผ่าน', tone: 'rose' },
  withdrawn: { label: 'ถอนข้อเสนอแล้ว', tone: 'slate' },
}

export const projectStatus = {
  active: { label: 'กำลังทำ', tone: 'blue' },
  in_review: { label: 'รอตรวจรับ', tone: 'amber' },
  revision: { label: 'ขอแก้ไข', tone: 'rose' },
  completed: { label: 'เสร็จสิ้น', tone: 'emerald' },
  disputed: { label: 'มีข้อพิพาท', tone: 'rose' },
}

export const escrowStatus = {
  unfunded: { label: 'ยังไม่ฝากเงิน', tone: 'slate' },
  funded: { label: 'ฝากเงินแล้ว', tone: 'blue' },
  released: { label: 'จ่ายเงินแล้ว', tone: 'emerald' },
  refunded: { label: 'คืนเงินแล้ว', tone: 'amber' },
}

export const transactionStatus = {
  pending: { label: 'รอดำเนินการ', tone: 'amber' },
  confirmed: { label: 'ยืนยันแล้ว', tone: 'emerald' },
  failed: { label: 'ไม่สำเร็จ', tone: 'rose' },
}

export const transactionTypes = {
  escrow_deposit: 'ฝากเงินเข้า Escrow',
  release: 'อนุมัติจ่ายเงิน',
  earning: 'รายได้จากงาน',
  withdrawal: 'ถอนเงิน',
  refund: 'คืนเงิน',
  fee: 'ค่าธรรมเนียมแพลตฟอร์ม',
}

export const budgetTypes = [
  { value: 'fixed', label: 'ราคาเหมารวม' },
  { value: 'hourly', label: 'คิดรายชั่วโมง' },
]

export const experienceLevels = [
  { value: 'entry', label: 'ระดับเริ่มต้น' },
  { value: 'intermediate', label: 'ระดับกลาง' },
  { value: 'expert', label: 'ระดับผู้เชี่ยวชาญ' },
]

export const availabilityOptions = [
  { value: 'open', label: 'เปิดรับงาน', tone: 'emerald' },
  { value: 'limited', label: 'รับงานจำกัด', tone: 'amber' },
  { value: 'unavailable', label: 'ไม่รับงานชั่วคราว', tone: 'slate' },
]

export const clientNav = [
  { label: 'ภาพรวม', to: '/client/dashboard', icon: LayoutDashboard },
  { label: 'ประกาศงาน', to: '/client/jobs', icon: ClipboardList },
  { label: 'สร้างประกาศงาน', to: '/client/jobs/new', icon: PlusCircle },
  { label: 'โครงการที่ดูแล', to: '/client/projects', icon: FolderKanban },
  { label: 'ประวัติการจ้าง', to: '/client/history', icon: History },
  { label: 'โปรไฟล์', to: '/client/profile', icon: UserRound },
]

export const freelancerNav = [
  { label: 'ภาพรวม', to: '/freelancer/dashboard', icon: LayoutDashboard },
  { label: 'ค้นหางาน', to: '/freelancer/jobs', icon: Search },
  { label: 'ข้อเสนอของฉัน', to: '/freelancer/proposals', icon: FileText },
  { label: 'โครงการ', to: '/freelancer/projects', icon: FolderKanban },
  { label: 'รายได้', to: '/freelancer/earnings', icon: Wallet },
  { label: 'รีวิว', to: '/freelancer/reviews', icon: Star },
  { label: 'โปรไฟล์', to: '/freelancer/profile', icon: Settings },
]

export const sharedNav = [
  { label: 'ข้อความ', to: '/messages', icon: MessageSquare },
  { label: 'แจ้งเตือน', to: '/notifications', icon: Bell },
  { label: 'กระเป๋าเงิน', to: '/wallet', icon: Wallet },
  { label: 'ตั้งค่า', to: '/settings', icon: Settings },
  { label: 'ช่วยเหลือ', to: '/help', icon: LifeBuoy },
]

export const adminNav = [
  { label: 'ผู้ใช้', to: '/admin/users', icon: Users },
  { label: 'ประกาศงาน', to: '/admin/jobs', icon: ClipboardList },
  { label: 'รายงานปัญหา', to: '/admin/reports', icon: ShieldCheck },
]

export const publicNav = [
  { label: 'ค้นหางาน', to: '/jobs' },
  { label: 'ฟรีแลนซ์', to: '/freelancers' },
  { label: 'วิธีใช้งาน', to: '/how-it-works' },
  { label: 'ช่วยเหลือ', to: '/help' },
]
