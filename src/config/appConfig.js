export const appConfig = {
  name: 'Freelink',
  tagline: 'จ้างคนเก่ง ให้งานจบ',
  description:
    'แพลตฟอร์มจ้างงานฟรีแลนซ์ที่รวมงานดี ๆ คนเก่ง และระบบ Escrow ที่ตรวจสอบได้ไว้ในที่เดียว',
  supportEmail: 'hello@freelink.dev',
  mockDataNotice: 'ข้อมูลตัวอย่างสำหรับทดลองใช้งาน — ยังไม่ได้เชื่อมต่อ Backend จริง',
  currency: 'THB',
  locale: 'th-TH',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  explorerUrl: import.meta.env.VITE_EXPLORER_URL || '',
}
