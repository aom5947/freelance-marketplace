import { delay } from './utils'
import { appConfig } from '@/config/appConfig'

const DEMO_USERS = {
  client: {
    id: 'u-client',
    name: 'Arthit Chaiyaporn',
    displayName: 'Nimbus Studio',
    email: 'arthit@nimbus.example',
    role: 'client',
    profileId: 'c1',
    avatarColor: 'from-indigo-500 to-violet-500',
    company: 'Nimbus Studio',
  },
  freelancer: {
    id: 'u-freelancer',
    name: 'ณัฐวุฒิ ศรีสมบูรณ์',
    displayName: 'ณัฐวุฒิ ศรีสมบูรณ์',
    email: 'nattawut@freelink.example',
    role: 'freelancer',
    profileId: 'f1',
    avatarColor: 'from-violet-500 to-indigo-600',
    title: 'Senior Product Designer',
  },
}

export const MOCK_AUTH_NOTICE =
  'Mock authentication สำหรับทดสอบ UI เท่านั้น — ไม่ใช่การยืนยันตัวตนจริง'

/**
 * Returns a demo user for the selected role.
 * TODO(auth): replace with the real OAuth/Firebase flow agreed with the backend
 * team. The returned shape is the contract the UI relies on.
 */
export async function signInMock(role = 'client', profile = {}) {
  await delay(420)
  const base = DEMO_USERS[role] || DEMO_USERS.client
  return {
    ...base,
    ...profile,
    role,
    provider: 'mock',
    isMock: true,
    token: `mock-${role}-${Date.now()}`,
    signedInAt: new Date().toISOString(),
  }
}

/** The UI calls this from the Google button; it stays explicit about being a mock. */
export async function signInWithGoogleMock(role) {
  if (appConfig.googleClientId) {
    // TODO(auth): once the backend exposes an OAuth callback, redirect here with
    // the client id and handle the callback route. Do not fake a session.
    throw new Error('พบ GOOGLE_CLIENT_ID แต่ยังไม่ได้เชื่อมต่อ OAuth callback กับ Backend')
  }
  return signInMock(role, { provider: 'google-mock' })
}

export { DEMO_USERS }
