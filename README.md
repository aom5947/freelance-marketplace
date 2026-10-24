# Freelink — Premium 3D Freelance Marketplace (Frontend)

Frontend ของแพลตฟอร์มจ้างงานฟรีแลนซ์ 2 บทบาท (Client / Freelancer) สร้างด้วย React + Vite + Tailwind CSS พร้อมฉาก 3D จริงด้วย Three.js / React Three Fiber และพร้อมเชื่อมต่อ Backend API กับ Solidity Smart Contract ในภายหลัง

> **สถานะปัจจุบัน:** ทุกอย่างทำงานด้วย **Mock Data / Mock Authentication** โดยเจตนา — ยังไม่มีการเชื่อมต่อ Backend, OAuth หรือ Blockchain จริง ปุ่มที่ต้องรอระบบหลังบ้านจะแจ้งตรงไปตรงมาและไม่รายงานความสำเร็จปลอม

---

## 1. Tech Stack

| ส่วน | เทคโนโลยี | เวอร์ชัน |
| --- | --- | --- |
| Build | Vite | 5.4.10 |
| UI | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4.14 |
| Routing | React Router DOM | 6.27.0 |
| Animation | Framer Motion | 11.11.17 |
| 3D | Three.js / @react-three/fiber / @react-three/drei | 0.169.0 / 8.17.10 / 9.114.3 |
| Icons | Lucide React | 0.453.0 |
| HTTP | Axios | 1.7.9 |
| Blockchain | Ethers.js | 6.13.4 |

---

## 2. เริ่มใช้งาน

```bash
cd freelance-marketplace
npm install
cp .env.example .env   # ไม่จำเป็นต้องแก้ค่าใด ๆ เพื่อรันโหมด mock
npm run dev
```

เปิด `http://localhost:5173`

คำสั่งอื่น:

```bash
npm run build     # production build
npm run preview   # preview dist
```

### Environment Variables

ดูรายละเอียดทั้งหมดใน `.env.example`

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `VITE_API_BASE_URL` | ว่าง | Base URL ของ Backend (เว้นว่าง = ใช้ mock) |
| `VITE_USE_MOCK_API` | `true` | `false` เมื่อ API พร้อมจริงเท่านั้น |
| `VITE_GOOGLE_CLIENT_ID` | ว่าง | Google OAuth client id (public) |
| `VITE_CHAIN_ID` | ว่าง | Chain ID ที่ทีม Contract กำหนด |
| `VITE_CONTRACT_ADDRESS` | ว่าง | ที่อยู่ Escrow Contract |
| `VITE_EXPLORER_URL` | ว่าง | Block explorer สำหรับลิงก์ธุรกรรม |

> ห้ามใส่ secret, private key หรือ password ใน `VITE_*` เพราะถูก bundle ไปฝั่ง browser ทั้งหมด

---

## 3. การเข้าใช้งานโหมดทดลอง (Mock)

1. ไปที่ `/login`
2. เลือกบทบาท **“ฉันต้องการจ้างงาน”** หรือ **“ฉันต้องการรับงาน”**
3. กรอกอีเมลใดก็ได้ และรหัสผ่านอย่างน้อย 6 ตัวอักษร (ไม่มีการตรวจสอบจริง) **หรือ** กด **“ดำเนินการต่อด้วย Google”**
4. ระบบจะพาไปยัง Dashboard ของบทบาทนั้น

ข้อมูลตัวอย่างทั้งหมดถูกแยกไว้ใน `src/services/mocks/` และมีข้อความ “Mock / ข้อมูลตัวอย่าง” กำกับใน UI จุดสำคัญ เช่น หน้า Wallet, Escrow, Login และ Transaction

---

## 4. Routes ทั้งหมด

### Public
| Path | หน้า |
| --- | --- |
| `/` | Landing Page + 3D Hero |
| `/jobs` | Browse Jobs (ค้นหา/กรองได้จริง) |
| `/jobs/:jobId` | Job Details |
| `/freelancers` | Freelancer Directory |
| `/freelancers/:freelancerId` | Freelancer Public Profile |
| `/how-it-works` | How It Works |
| `/help` | Help / FAQ |
| `/login`, `/register` | Authentication UI |
| `*` | 404 Not Found |

### Client (ต้อง login เป็น client)
`/client/dashboard`, `/client/jobs`, `/client/jobs/new`, `/client/jobs/:jobId/edit`, `/client/jobs/:jobId/applicants`, `/client/jobs/:jobId/compare`, `/client/projects`, `/client/projects/:projectId`, `/client/projects/:projectId/review`, `/client/projects/:projectId/escrow`, `/client/history`, `/client/profile`

### Freelancer (ต้อง login เป็น freelancer)
`/freelancer/dashboard`, `/freelancer/jobs`, `/freelancer/jobs/:jobId`, `/freelancer/proposals`, `/freelancer/proposals/new/:jobId`, `/freelancer/projects`, `/freelancer/projects/:projectId`, `/freelancer/projects/:projectId/submit`, `/freelancer/earnings`, `/freelancer/transactions`, `/freelancer/reviews`, `/freelancer/profile`

### Shared (ต้อง login)
`/notifications`, `/messages`, `/messages/:threadId`, `/wallet`, `/transactions/:transactionId`, `/settings`, `/admin`, `/admin/:section`

`/admin` เป็น **UI ตัวอย่างเท่านั้น** ไม่มี Backend หรือสิทธิ์การจัดการจริง

---

## 5. โครงสร้างโปรเจกต์

```text
freelance-marketplace/
├── src/
│   ├── components/
│   │   ├── common/           # Button, Input, Modal, Toast, EmptyState, ...
│   │   ├── layout/           # Navbar, Footer, Sidebar, MobileNav, ...
│   │   ├── jobs/ proposals/ projects/ profile/ wallet/
│   │   └── three/            # Hero3DScene, HeroVisual, SceneFallback, webgl.js
│   ├── pages/
│   │   ├── public/ auth/ client/ freelancer/ shared/ admin/
│   ├── layouts/              # Public / Auth / Dashboard
│   ├── routes/               # AppRoutes, ProtectedRoute
│   ├── hooks/                # useAsync, useReducedMotion, useDebouncedValue, ...
│   ├── contexts/             # AuthContext, ToastContext, WalletContext
│   ├── services/
│   │   ├── api/              # apiClient, endpoints, authService, jobService, ...
│   │   ├── auth/             # authService (mock ↔ real switch)
│   │   ├── blockchain/       # walletService, contractService, transactionService
│   │   └── mocks/            # mock data + mock services
│   ├── data/                 # seed mock data
│   ├── utils/                # format, validators, cn
│   ├── constants/            # categories, status maps, navigation
│   ├── config/               # appConfig, contractConfig
│   ├── App.jsx
│   └── main.jsx
├── .env.example
└── tailwind.config.js
```

Path alias `@` ชี้ไปที่ `src` (ตั้งค่าใน `vite.config.js`)

---

## 6. Design System

- **สี:** `brand` (Indigo #6366F1) เป็น accent หลัก, `violet`, `ink` (เกือบดำ #0B1020) สำหรับตัวอักษร, `paper` (#F7F7FB) สำหรับพื้นหลัง, `mint` สำหรับสถานะสำเร็จ
- **ฟอนต์:** Plus Jakarta Sans + Noto Sans Thai (โหลดจาก Google Fonts ใน `index.html`)
- **Radius / Shadow:** `rounded-2xl`–`rounded-5xl`, เงานุ่ม `shadow-soft` / `shadow-lift` / `shadow-glow`
- **Utility classes:** `.container-page`, `.card`, `.eyebrow`, `.focus-ring` ใน `src/index.css`
- **Motion:** Framer Motion สำหรับ page transition, stagger, hover lift, modal, tab; `useReducedMotion` ใช้ปิด animation ทั้ง UI และ 3D
- **ภาษา:** โครงสร้าง UI รองรับข้อความไทยเป็นหลัก พร้อม label ภาษาอังกฤษในจุดที่เป็นศัพท์เทคนิค

---

## 7. 3D Hero (WebGL จริง)

ไฟล์หลัก: `src/components/three/Hero3DScene.jsx`

ฉากประกอบด้วย:

- แกนกลาง Icosphere ที่บิดเบี้ยวด้วย `MeshDistortMaterial` (สื่อถึงแพลตฟอร์ม)
- วัตถุลอย 7 ชิ้น (icosahedron, octahedron, dodecahedron, torus, box, sphere) เป็นตัวแทน Client / Freelancer
- เส้นเชื่อมต่อ (`Line`) จากแกนกลางไปยังแต่ละวัตถุ (สัญญา / ความร่วมมือ)
- วงแหวนสองชั้นหมุนช้า ๆ และจุดแสงลอย (`Sparkles`)
- กระจกเงา/แผงโปร่งแสง (`RoundedBox` + `meshPhysicalMaterial`) แทนโครงการ
- Mouse parallax บน Desktop, hover ขยายวัตถุ, float/rotation ด้วย spring-like easing
- `SceneFallback` แสดงเมื่อ WebGL ไม่รองรับ

**Performance guards**

- 3D ถูก lazy-load แยก chunk (`HeroVisual` → `Hero3DScene`)
- มี Canvas เดียวทั้งแอป, DPR จำกัด (1.75 desktop / 1.3 mobile)
- มือถือลดจำนวนวัตถุและ particles
- `IntersectionObserver` หยุด render เมื่อ Hero อยู่นอกจอ
- `prefers-reduced-motion` → หยุด animation, ลดความซับซ้อน
- ไม่โหลดโมเดล/HDRI ภายนอก — สร้างจาก geometry ล้วน

> หมายเหตุ: chunk ของ Three.js มีขนาดประมาณ 845 kB (gzip ~228 kB) และถูกโหลดเฉพาะหน้า Landing เท่านั้น

---

## 8. การเชื่อมต่อ Backend

โหมด mock/real ถูกสลับที่ `VITE_USE_MOCK_API` โดย UI ไม่ต้องแก้

- `src/services/api/apiClient.js` — Axios instance, แนบ Bearer token, normalize error
- `src/services/api/endpoints.js` — **DRAFT** endpoint map (ยังไม่ยืนยันกับทีม Backend)
- `src/services/api/jobService.js`, `proposalService.js`, `projectService.js`, `profileService.js`, `notificationService.js`, `transactionService.js`, `authService.js`
- ทุก service เรียก mock ก่อนเมื่อ `VITE_USE_MOCK_API=true` และเรียก API จริงเมื่อปิด mock
- `src/services/auth/authService.js` — mock login / Google mock / session, พร้อมสลับไป OAuth จริง
- `src/services/mocks/` — mock data ทั้งหมด (Job, Freelancer, Proposal, Project, Notification, Transaction, Message)

รายละเอียดสัญญา API และ checklist สำหรับเพื่อนร่วมทีมอยู่ใน **[INTEGRATION.md](./INTEGRATION.md)**

---

## 9. การเชื่อมต่อ Solidity / Wallet

- `src/config/contractConfig.js` — placeholder ทั้งหมด (chain id, address, ABI, method names, currency)
- `src/services/blockchain/walletService.js` — connect/disconnect, chain id, balance, network switch, wallet events
- `src/services/blockchain/contractService.js` — read/write functions ที่ **throw `ContractNotConfiguredError`** จนกว่าจะได้ ABI/address/chain id
- `src/services/blockchain/transactionService.js` — ติดตาม pending / confirmed / failed จาก provider จริง
- UI Escrow และ Wallet แสดงสถานะ “ยังไม่พร้อม” อย่างตรงไปตรงมา

การเชื่อม Wallet ทำได้จริงผ่าน MetaMask/EIP-1193 แต่ **การฝาก/ปล่อยเงินจะยังไม่ทำงาน** จนกว่าทีม Contract จะส่งข้อมูลครบ

---

## 10. การตรวจสอบที่ทำแล้ว (ณ วันที่พัฒนา)

- `npm run build` ผ่าน (Vite production build)
- เปิด route หลักทั้งหมดใน `AppRoutes` ด้วย Chrome headless (Desktop 1440×900 + Mobile 390×844) — ไม่มี page error, ไม่มี console error และหน้า public/แดชบอร์ดหลักไม่พบ horizontal overflow
- ทดสอบ workflow จริงบน mock:
  - Client สร้างประกาศงาน → ปรากฏใน Manage Jobs
  - Freelancer ส่งข้อเสนอต่องานที่สร้างใหม่ → ปรากฏใน My Proposals
  - Freelancer ขอถอนเงิน → toast ยืนยันคำขอ (mock)
  - Client จ้างงาน → ไปหน้า Project Details และแสดง “Escrow ยังไม่ถูกฝากเงิน”
  - กดฝากเงิน Escrow โดยไม่มี Wallet → แสดง error ตามจริง ไม่แจ้งสำเร็จปลอม
  - Client อนุมัติงาน → สถานะเปลี่ยนเป็น “เสร็จสิ้น” (mock) โดยไม่กล่าวอ้างว่า confirmed บน Blockchain
- ตรวจสอบ route แก้ไขประกาศงาน (`/client/jobs/:jobId/edit`) แบบ end-to-end: prefill, บันทึก, validation, ยกเลิก, invalid id และการกันสิทธิ์ข้ามบทบาท
- ตรวจ Admin console ทั้ง 3 section (`/admin/users`, `/admin/jobs`, `/admin/reports`) รวมถึงการระงับผู้ใช้ การปิดรายงาน และ responsive บนมือถือ
- ตรวจสอบ utility ของ Tailwind ที่ไม่มีอยู่ใน default scale และแก้ไขแล้ว

> การตรวจสอบทำด้วย Chrome headless ผ่านสคริปต์ชั่วคราวนอกโปรเจกต์ จึงไม่มี test dependency ค้างใน `package.json`

---

## 11. ข้อจำกัดที่ทราบ

- ไม่มี Backend / Database / Smart Contract ตามขอบเขตงาน
- Mock authentication ไม่ใช่การยืนยันตัวตนจริง และไม่ควรใช้ production
- การชำระเงิน, Escrow, Transaction Hash เป็น mock จนกว่าจะเชื่อม wallet + contract จริง
- หน้า Admin เป็น UI ตัวอย่าง ไม่มีระบบสิทธิ์
- Google Fonts ต้องใช้อินเทอร์เน็ต (มี fallback เป็น system font)
- ยังไม่มีชุดทดสอบ automated test ในโปรเจกต์ (ตรวจด้วยสคริปต์ QA ชั่วคราวเท่านั้น)

---

## 12. Workflow แนะนำสำหรับทีม

1. อ่าน `INTEGRATION.md` และยืนยัน endpoint/response shape กับทีม Backend
2. เติมค่า `.env` และตั้ง `VITE_USE_MOCK_API=false`
3. แก้ `src/services/api/endpoints.js` ให้ตรงกับ API จริง
4. ปรับ service ที่เกี่ยวข้อง (โดยไม่ต้องแตะ UI)
5. เติม `contractConfig.js` (ABI, address, chain id, methods) เมื่อ Contract พร้อม
6. ทดสอบ workflow เดิมซ้ำ (สร้างงาน → เสนอราคา → จ้าง → ส่งงาน → ตรวจรับ → จ่ายเงิน)
