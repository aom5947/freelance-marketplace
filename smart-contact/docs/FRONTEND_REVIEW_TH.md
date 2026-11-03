# รายงานตรวจ Frontend เทียบกับ Contract v2

> ตรวจเมื่อ 31 ต.ค. 2026 · โค้ด frontend ที่ root ของ repo (commit `0439c6b`, ส่วน frontend ไม่ได้ถูกแก้ตั้งแต่ commit `b64c3df`)
> **ไม่ได้แก้ไฟล์ใน frontend แม้แต่ไฟล์เดียว** สิ่งที่ควรแก้ทั้งหมดอยู่ในไฟล์นี้ในรูปข้อเสนอ (โค้ดตัวอย่าง **ยังไม่ได้รันกับ UI จริง**)

## วิธีตรวจและขอบเขต

| ทำอะไร | ผล |
| --- | --- |
| อ่านโค้ดส่วน wallet / contract / escrow / ส่งงาน / ตรวจรับ / mock data | ดูรายละเอียดด้านล่าง |
| `vite build` (คัดลอกไปโฟลเดอร์ชั่วคราวนอก repo แล้วติดตั้งที่นั่น) | ✅ ผ่าน |
| ESLint กฎ `no-undef` / `react/jsx-no-undef` ทั้ง `src/` (โฟลเดอร์ชั่วคราว) | พบ error จริง **1 จุด** (ข้อ 1) ที่เหลือเป็นแค่ตัวแปรที่ไม่ได้ใช้ |
| ตรวจพฤติกรรม ethers 6.13.4 ที่โค้ดพึ่งพา (decode custom error, `wait()` เมื่อ revert) | ยืนยันจากซอร์สของ ethers ในโฟลเดอร์ชั่วคราว |
| **ไม่ได้ทำ** | เปิดแอปในเบราว์เซอร์, ต่อ MetaMask, ลองฝาก/ปล่อยเงินจริง, ทดสอบกับ contract ที่ deploy แล้ว |

ความรุนแรง: 🔴 บั๊ก/เสี่ยงเสียเงิน · 🟠 ต้องแก้ก่อนต่อ Contract v2 · 🟡 ควรปรับ

## สรุป

Frontend เขียนมาอย่างซื่อสัตย์ (ไม่แจ้งสำเร็จปลอม, ปิด contract จนกว่าจะตั้งค่า) แต่ **ยังต่อ Contract v2 ไม่ได้** มี 3 จุดที่ต้องระวังเป็นพิเศษ: บั๊ก 1 จุดในหน้า Escrow (ข้อ 1), การส่ง **ตัวเลขบาทเป็น ETH** (ข้อ 2) และไม่มีการกันผิด network (ข้อ 3) ส่วน **ขั้นตอน "ขอแก้ไขงาน" ที่ UI มีแต่ contract เดิมไม่รองรับ** ตัดสินใจแล้วเมื่อ 31 ต.ค. 2026 ให้เพิ่ม `requestRevision` ใน contract (ข้อ 12) ตอนนี้ฝั่ง contract เสร็จแล้ว เหลือให้ frontend ต่อ

| # | ระดับ | เรื่อง | ไฟล์หลัก |
| --- | --- | --- | --- |
| 1 | 🔴 | ใช้ `EmptyState` โดยไม่ import → หน้า Escrow crash | `EscrowPayment.jsx:67` |
| 2 | 🔴 | ส่งยอด **บาท** เข้า `parseUnits` เป็น ETH และส่งยอดรวมค่าธรรมเนียมเป็น `amount` | `EscrowPayment.jsx:80-81,105` · `contractService.js:74` |
| 3 | 🔴 | ไม่ตรวจ chain ก่อนส่ง transaction | `contractService.js:36-40,61-76` |
| 4 | 🟠 | Config ว่างทั้งหมด (ABI, currency, methods) | `contractConfig.js:20-46` |
| 5 | 🟠 | `depositEscrow` เรียกผิดรูปแบบ (ไม่มี freelancer / deadline / termsHash / amount) | `contractService.js:61-76` |
| 6 | 🟠 | ฟังก์ชันอื่นส่ง `projectId` แทน `escrowId` | `contractService.js:43,79,87,95` |
| 7 | 🟠 | ไม่มี wallet address ของ client / freelancer ในข้อมูลใด ๆ | ทั้ง `src/` |
| 8 | 🟠 | `deadline` / `termsHash` ไม่มีที่มาที่ชัด และ `dueDate` อาจทำให้ฝากไม่ผ่าน | `mockProposalService.js` · `SubmitProposal.jsx:59` |
| 9 | 🟠 | ฝากสำเร็จแล้วสถานะในหน้าไม่เปลี่ยน (ไม่มีทางเขียนกลับ) | `EscrowPayment.jsx:114-117` |
| 10 | 🟠 | "อนุมัติงาน" ทำแค่ mock + ตั้ง `released` เอง ไม่เรียก contract | `ReviewWork.jsx:96` · `mockProjectService.js` |
| 11 | 🟠 | ขาดปุ่ม/หน้าของขั้นตอนใหม่ (accept, ส่งงานบน chain, เบิก, dispute, refund) | `SubmitWork.jsx` · `ProjectDetails.jsx` |
| 12 | 🟠 | **ขั้นตอน "ขอแก้ไขงาน/ส่งใหม่": contract รองรับแล้ว (`requestRevision`) frontend ต้องต่อ** | `ReviewWork.jsx` · `SubmitWork.jsx` |
| 13 | 🟡 | จัดการ error: ไม่ถอดรหัส custom error, ไม่รองรับ insufficient funds | `errors.js:21-33` |
| 14 | 🟡 | ข้อความ/ลิงก์ค้างของ ERC-20 | `EscrowPayment.jsx:383-390` ฯลฯ |
| 15 | 🟡 | รายละเอียดเล็ก (bigint, checksum, float) | — |

---

## 🔴 1. หน้า Escrow crash เมื่อ client คนอื่นเปิด

`src/pages/client/EscrowPayment.jsx:65-76` render `<EmptyState …/>` แต่ไฟล์นี้ไม่ได้ import (ESLint: `'EmptyState' is not defined`) ถ้า `project.clientId !== user.profileId` จะเกิด `ReferenceError` แทนข้อความ "คุณไม่มีสิทธิ์" (`vite build` ไม่จับเพราะมองเป็นตัวแปร global)

**แก้:** เพิ่ม `import { EmptyState } from '@/components/common/EmptyState'` (ไฟล์อื่นเช่น `ReviewWork.jsx:27` ใช้ path นี้)

## 🔴 2. ยอด "บาท" ถูกส่งเป็น ETH

```js
// EscrowPayment.jsx
const fee = Math.round(project.budget * PLATFORM_FEE_RATE)   // บาท
const total = project.budget + fee                            // บาท
contractService.depositEscrow({ projectId: project.id, amount: total })

// contractService.js:74
const value = parseUnits(String(amount), contractConfig.currency.decimals || 18)
```

งาน 50,000 บาท → `total = 52,500` → ส่ง **52,500 ETH** (ผมคำนวณแล้ว: `parseUnits("52500", 18)` = 52,500 ETH) บน testnet จะเจอ insufficient funds แต่ถ้า wallet อยู่ mainnet และมีเงินพอ ผลคือเสียเงินมหาศาล

อีกปัญหา: ส่ง **ยอดรวมค่าธรรมเนียม** เป็น `amount` แต่ใน v2 `amount` คือ "ค่าจ้าง" และ contract บวกค่าธรรมเนียมเพิ่มเอง ถ้าส่ง `total` จะถูกเก็บค่าธรรมเนียมซ้ำซ้อน

**แก้:** แปลงบาท → ETH ด้วยอัตราคงที่ใน config (ข้อ 4.5 ของคู่มือ) ได้ `amountWei` เป็น bigint (ค่าจ้างล้วน) แล้วให้ contract คิดค่าธรรมเนียมผ่าน `quote()` ดูโค้ดข้อเสนอในข้อ 5

## 🔴 3. ไม่ตรวจ chain ก่อนส่ง transaction

`INTEGRATION.md` หัวข้อ 11 ระบุให้ตรวจ `chainId` ก่อนทุกธุรกรรม แต่โค้ดจริงไม่ทำ: `getSignerContract()` สร้าง `Contract` ตาม `VITE_CONTRACT_ADDRESS` ทันที และ `handleDeposit` ไม่ดู `wallet.isWrongNetwork` (มีแค่ปุ่ม Wallet ที่ขึ้นเตือน `WalletConnectButton.jsx:96`)

ผลที่เกิดตามกลไกของ EVM (ผมอนุมานจากพฤติกรรมของ EVM ไม่ได้ทดลองบน mainnet): ถ้า wallet อยู่ network อื่นและ address นั้นไม่มี contract การเรียก payable function ไปยัง address ที่ไม่มีโค้ด **สำเร็จและโอน ETH ไปจริง** เงินไม่เข้า escrow และไม่ได้คืน

**แก้:** ก่อนเขียน contract ทุกครั้งให้เช็ก chain (และอาจเช็กว่า address มีโค้ดด้วย `provider.getCode`) โค้ดข้อเสนออยู่ข้อ 5

## 🟠 4. Config ว่างทั้งหมด

`contractConfig.js` ตอนนี้: `chainName: null`, `abi: null`, `currency.type: null`, `methods.*: null` (บรรทัด 20, 28, 32-37, 40-46) จึง `isContractConfigured()` เป็น false และทุก write โยน `ContractNotConfiguredError` (ตั้งใจและถูกต้อง)

**ข้อเสนอ** (ค่า `.env` ได้จากผล `npm run deploy:sepolia` ใน `smart-contact/`):

```js
// คัดลอก smart-contact/abi/FreelinkEscrow.abi.json ไปไว้ที่ src/config/ (สร้างด้วย npm run export-abi)
import abi from './FreelinkEscrow.abi.json'

chainName: 'Sepolia',
abi,
currency: { type: 'native', symbol: 'ETH', address: null, decimals: 18 },
methods: {
  depositEscrow: 'depositEscrow',
  acceptEscrow: 'acceptEscrow',
  submitWork: 'submitWork',
  releasePayment: 'releasePayment',
  claimAfterReview: 'claimAfterReview',
  refundClient: 'refundClient',
  openDispute: 'openDispute',
  settleExpiredDispute: 'settleExpiredDispute',
  withdraw: 'withdraw',
  getEscrow: 'getEscrow',
  quote: 'quote',
  computeEscrowId: 'computeEscrowId',
},
```

และเพิ่มค่าอัตราแลกเปลี่ยน เช่น `thbPerEth` ใน config/`.env` (ข้อ 4.5 ของคู่มือ) `.env`: `VITE_CHAIN_ID=11155111`, `VITE_CONTRACT_ADDRESS=0x…`, `VITE_EXPLORER_URL=https://sepolia.etherscan.io`

## 🟠 5. `depositEscrow` เรียกผิดรูปแบบ

ตอนนี้ `contract[method](projectId, { value })` แต่ v2 ต้อง `depositEscrow(projectId, freelancer, deadline, termsHash, amount)` พร้อมแนบ `quote(amount).total`

**ข้อเสนอสำหรับ `contractService.js`** (ยังไม่ได้ทดสอบ):

```js
import { id } from 'ethers'
import { getWalletChainId } from './walletService'

async function requireRightChain() {
  const current = await getWalletChainId()
  if (current !== contractConfig.chainId) {
    throw new WalletError(
      `Wallet อยู่คนละ Network — กรุณาสลับไป ${contractConfig.chainName} (Chain ${contractConfig.chainId})`,
      'WRONG_NETWORK',
    )
  }
}

// เรียกก่อนทุก write (ข้อ 3)
export async function depositEscrow({ projectId, freelancerAddress, deadline, termsHash, amountWei }) {
  requireConfigured()
  await requireRightChain()
  const contract = await getSignerContract()
  const [, total] = await contract.quote(amountWei)          // ค่าจ้าง + ค่าธรรมเนียม จาก contract
  return contract.depositEscrow(id(projectId), freelancerAddress, deadline, termsHash, amountWei, {
    value: total,
  })
}

// แปลงบาท → wei ด้วยเลขจำนวนเต็ม (ไม่ใช้ float)  amountWei = thb / thbPerEth × 1e18
export function thbToWei(thb, thbPerEth) {
  return (BigInt(Math.round(thb * 100)) * 10n ** 18n) / BigInt(Math.round(thbPerEth * 100))
}
```

ปุ่ม/ข้อความในหน้า Escrow ควรแสดงยอดเป็น ETH ควบคู่กับบาท และดึงค่าธรรมเนียมจาก `quote()` แทน `PLATFORM_FEE_RATE` (บรรทัด 37)

## 🟠 6. ฟังก์ชันอื่นส่ง `projectId` แทน `escrowId`

`readEscrow`, `releasePayment`, `refundClient`, `openDispute` (`contractService.js:43,79,87,95`) และตัวเรียกใน `EscrowPayment.jsx:143` ส่ง `project.id` (string) ตรง ๆ v2 ต้องส่ง `escrowId` (bytes32)

**ข้อเสนอ:** เก็บ `escrowId` ไว้กับโปรเจกต์ (ได้จาก event `EscrowFunded` ตามหัวข้อ 4.11 ของคู่มือ) หรือคำนวณด้วย `contract.computeEscrowId(clientAddress, id(projectId))` ซึ่งต้องรู้ address ของ client (ข้อ 7)

## 🟠 7. ไม่มี wallet address ของ client / freelancer

ค้นทั้ง `src/` ไม่พบ field ที่เก็บ address ของผู้ใช้ (มีแต่ `wallet.address` ที่ได้จาก MetaMask ตอนเชื่อม ไม่ถูกบันทึกกับโปรไฟล์) แต่ `depositEscrow` ต้องรู้ address ของ **freelancer** ตอนฝาก

**ข้อเสนอ (ตามข้อ 4.10 ของคู่มือ):** เพิ่ม `walletAddress` ในโปรไฟล์ (ProfileSettings / ClientProfile) ให้ผู้ใช้กด "เชื่อม wallet" แล้วบันทึก และให้ Backend เป็นเจ้าของข้อมูลนี้ UI ฝากเงินต้อง **ปิดปุ่มฝาก** ถ้า freelancer ของโปรเจกต์ยังไม่ได้ผูก wallet

## 🟠 8. `deadline` และ `termsHash`

- `project.dueDate` มีอยู่แล้ว (สร้างตอนจ้าง = วันนี้ + `deliveryDays`, `mockProposalService.js:115` ในฟังก์ชัน `hireProposal`) ใช้เป็นที่มาของ `deadline` ได้ แต่:
  - `SubmitProposal.jsx:59` ตรวจ `deliveryDays` แค่ว่าเป็นเลขบวก ไม่มีเพดาน → ถ้า > 365 วัน contract ปฏิเสธ (`InvalidDeadline`)
  - ถ้า client ฝากเงินหลังจ้างหลายวัน `dueDate` อาจผ่านไปแล้วหรือเหลือเวลาน้อยจน freelancer accept/ส่งงานไม่ทัน
- ยังไม่มีที่มาของ `termsHash` (ข้อ 4.4 ของคู่มือ: hash จากข้อความที่ Backend เก็บ)

**ข้อเสนอ (ต้องให้ทีมตัดสินใจ):** คำนวณ `deadline` ตอนฝาก เช่น `max(dueDate, now + deliveryDays)` และจำกัด `deliveryDays` ≤ 365 ที่ฟอร์มข้อเสนอ

## 🟠 9. ฝากสำเร็จแล้วหน้าไม่เปลี่ยนสถานะ

หลัง `CONFIRMED` หน้า Escrow เรียกแค่ `refresh()` (`EscrowPayment.jsx:114-117`) ซึ่งโหลดโปรเจกต์ใหม่จาก API แต่ไม่มีโค้ดใดเขียน `escrowStatus` กลับ (ใน mock มีค่า `unfunded` ตอนจ้าง และ `released` ตอนอนุมัติเท่านั้น; `projectService.updateProject` มีแต่ไม่ถูกเรียก) ผล: ฝากเงินจริงสำเร็จ แต่หน้ายังเป็น "ยังไม่ฝากเงิน" และปุ่มส่งงานของ freelancer ยังถูกปิด

**ข้อเสนอ:** ตามหลัก "blockchain คือความจริงเรื่องเงิน" ให้ Backend ฟัง event แล้วอัปเดต DB (หัวข้อ 4.11) ระหว่างที่ยังไม่มี Backend อาจให้หน้า Escrow อ่าน `getEscrow(escrowId)` มาแสดงสถานะ (แปลง `status` ซึ่ง ethers คืนเป็น `bigint` ด้วย `Number(...)`) และไม่บันทึกสถานะเอง

## 🟠 10. "อนุมัติงาน" ไม่เรียก contract

`ReviewWork.jsx:96` เรียก `projectService.approveSubmission` ซึ่งใน mock (`mockProjectService.js`) ตั้ง `escrowStatus='released'`, `status='completed'` และสร้างธุรกรรม `confirmed` (ติดป้าย `isMock`) โดยไม่มีเงินขยับ ถ้าสลับเป็น API จริง (`POST /projects/:id/approve`) แล้ว Backend ตั้งสถานะ released เอง จะเกิดกรณี "หน้าเว็บบอกจ่ายแล้วแต่เงินยังอยู่ในตู้เซฟ" (ดูหมายเหตุข้อ 7 ในคู่มือ)

ยังมีปุ่มปล่อยเงินซ้ำซ้อนอีกที่: "ทดลองปล่อยเงิน" ใน `EscrowPayment.jsx:280-284`

**ข้อเสนอ:** รวมเหลือจุดเดียว: ปุ่ม "อนุมัติ" เรียก `releasePayment(escrowId)` บน chain ก่อน แล้ว Backend อัปเดตจาก event `PaymentReleased` ไม่ให้ `approve` ฝั่ง API ตั้ง `released` เอง

## 🟠 11. ขาดปุ่ม/หน้าของขั้นตอนใหม่

| ขั้นตอนใน v2 | สถานะใน UI ตอนนี้ |
| --- | --- |
| freelancer `acceptEscrow` | ไม่มีปุ่ม/หน้า |
| freelancer `submitWork` บน chain | `SubmitWork.jsx` เรียกแค่ API (mock) |
| ปุ่ม "ส่งงาน" เปิดเมื่อ | `funded` (`SubmitWork.jsx:99`, `ProjectDetails.jsx:454`) แต่ v2 ต้องรอ **Active** (หลัง accept) ไม่งั้น `InvalidStatus` |
| นับถอยหลัง `reviewEndsAt` + `claimAfterReview` | ไม่มี |
| `openDispute` | มีฟังก์ชันใน `contractService` แต่ไม่มีปุ่ม/หน้า |
| `requestRevision` (ปุ่ม "ขอแก้ไขงาน" ปัจจุบันเรียกแค่ API) | ดูข้อ 12 |
| `refundClient`, `settleExpiredDispute`, `withdraw` | ไม่มี |
| สถานะ `escrowStatus` | มีแค่ 4 ค่า (`constants/index.js:96-101`) v2 มี 8 (ถ้าคงไว้ ต้องแมป `Active`/`Submitted`/`Disputed`/`Resolved` ให้ชัด) |

**ข้อเสนอ:** ทำตามตาราง "สถานะ → UI" ในหัวข้อ 4.2 ของ `BACKEND_START_ver_0_2.md` โดยเริ่มจาก accept → submit → release (เส้นทางปกติ) ก่อน แล้วค่อยเพิ่ม dispute/refund

## 🟠 12. ขั้นตอน "ขอแก้ไขงาน": contract รองรับแล้ว frontend ต้องต่อ

UI มี flow แก้ไขงานครบ: ปุ่ม "ขอแก้ไขงาน" (`ReviewWork.jsx:253`), สถานะโครงการ `revision` (`constants/index.js:91`), และ freelancer "แก้ไขและส่งงานใหม่" (`ProjectDetails.jsx`, `SubmitWork.jsx`) แต่ contract ฉบับ 0.2 ส่งงานได้ครั้งเดียว ถ้าปล่อยไว้ client กด "ขอแก้ไข" (ฝั่ง API) แล้วเวลาตรวจรับบน chain ยังเดินต่อ พอครบ freelancer เบิกเงินได้เองทั้งที่งานยังไม่ได้แก้

**ตัดสินใจแล้ว (31 ต.ค. 2026): เลือกทางเลือก C** เพิ่ม `requestRevision` ใน contract ทำเสร็จและผ่านเทสต์แล้ว (ทางเลือก A/B ที่เคยเสนอไว้ถูกตัดทิ้ง) กติกา:

| ข้อ | กติกา |
| --- | --- |
| ใครขอได้ / เมื่อไร | เฉพาะ client ตอน `Submitted` และภายในช่วงตรวจรับ `requestRevision(escrowId, reason)` |
| ผล | สถานะกลับเป็น `Active`, `revisionCount` +1, ล้าง `reviewEndsAt` |
| deadline ใหม่ | contract กำหนด = `max(deadline เดิม, ตอนนี้ + revisionPeriod)` (ค่าเริ่มต้น 7 วัน) client ตั้งเองไม่ได้ |
| จำนวนรอบ | `maxRevisions` ต่อ escrow (ค่าเริ่มต้น 2) นับต่อเนื่อง ไม่รีเซ็ตเมื่อส่งซ้ำ = ส่งงานได้ 3 รอบ ครบแล้ว client เหลือปล่อยเงินหรือ `openDispute` |
| ส่งงานแก้ | freelancer เรียก `submitWork` เดิม ช่วงตรวจรับเริ่มนับใหม่ |
| ถ้า freelancer ไม่ส่งแก้ทัน | client ขอเงินคืนเองไม่ได้ (`DisputeRequired`) ต้อง `openDispute` ให้ arbiter ตัดสินแบ่ง |
| freelancer แก้เองโดยไม่ถูกขอ | ทำไม่ได้ (`submitWork` ต้องสถานะ `Active`) |

**สิ่งที่ frontend ต้องทำ** (ยังไม่มีข้อใดถูกแก้ในโค้ด):

1. `ReviewWork.jsx`: ปุ่ม "ขอแก้ไขงาน" เรียก `requestRevision(escrowId, reason)` บน chain ใช้ข้อความ feedback เดิมเป็น `reason` (เตือนว่า **อยู่บน chain ถาวร** ห้ามใส่ข้อมูลส่วนตัว) และ Backend เก็บรายละเอียดยาว ๆ ไว้ใน DB
2. แสดง "ขอแก้ได้อีก N ครั้ง" = `maxRevisions - revisionCount` และซ่อน/ปิดปุ่มเมื่อครบ พร้อมคำอธิบายว่าที่เหลือคืออนุมัติหรือปฏิเสธ (dispute) อ่าน `maxRevisions()` / `revisionPeriod()` จาก contract อย่าฮาร์ดโค้ด
3. แมปสถานะ: `revision` ใน UI = on-chain `Active` ที่ `revisionCount > 0` และ `in_review` = `Submitted` Backend อัปเดตจาก event `RevisionRequested` / `WorkSubmitted`
4. `SubmitWork.jsx`: ปุ่มส่งงาน (`SubmitWork.jsx:197`) เปิดเฉพาะตอน on-chain เป็น `Active` ตอนนี้ไม่ได้ปิดตอน `in_review` (มีแค่แบนเนอร์ที่ `:125` ที่บอกว่าส่งซ้ำได้) ซึ่งบน chain จะ revert `InvalidStatus` ควรแก้ข้อความแบนเนอร์ด้วย และแสดง deadline ใหม่ (ได้จาก event หรือ `getEscrow`) ให้ freelancer เห็น
5. ปุ่มขอเงินคืนของ client แสดงเฉพาะ `Active` + `revisionCount == 0` + เลย deadline; ถ้าเคยส่งงานแล้วให้นำไปที่ "เปิดข้อพิพาท"
6. แมป error: `RevisionLimitReached` ("ขอแก้ครบจำนวนครั้งแล้ว เหลือปล่อยเงินหรือเปิดข้อพิพาท"), `DisputeRequired` ("เคยส่งงานแล้ว ต้องเปิดข้อพิพาท"), `ReviewPeriodOver` (ข้อ 13)
7. ethers คืน `revisionCount`/`maxRevisions` (uint8) เป็น `bigint` ต้อง `Number(...)` ก่อนเทียบหรือลบ

## 🟡 13. จัดการ error

- `errors.js:21-33` รู้จักแค่ user rejected / ไม่มี wallet / ยังไม่ตั้งค่า ที่เหลือคืน `error.message` ดิบ ๆ ไม่รองรับ `INSUFFICIENT_FUNDS`, wrong network และ custom error ของ contract ตามตารางหัวข้อ 8.4 ของ v0.2
- `transactionService.js:22-25` ตรวจ `receipt.status === 0` แต่ ethers 6.13.4 ที่โปรเจกต์ใช้ **โยน `CALL_EXCEPTION` จาก `tx.wait()` เมื่อ revert** (`providers/provider.js:1119`) โค้ดจึงเข้า `catch` เสมอ กิ่ง `status === 0` ไม่ถูกใช้ และข้อความที่ผู้ใช้เห็นเป็นข้อความดิบจาก ethers

**ข้อเสนอ:** ถอดรหัสด้วย ABI แล้วแมปเป็นภาษาไทย (ผมตรวจแล้วว่า `Interface.parseError(data)` คืนชื่อและ args ของ custom error ได้ เช่น `WrongPayment [expected, sent]`):

```js
const THAI = {
  WrongPayment: 'ยอดที่แนบไม่ตรง (ค่าธรรมเนียมอาจเพิ่งเปลี่ยน) ลองใหม่อีกครั้ง',
  AlreadyExists: 'โปรเจกต์นี้เคยฝากเงินแล้ว',
  NotAuthorized: 'คุณไม่มีสิทธิ์ทำรายการนี้',
  InvalidStatus: 'สถานะปัจจุบันยังทำรายการนี้ไม่ได้',
  InvalidTerms: 'ข้อตกลงไม่ตรงกับที่ลูกค้าระบุ',
  DeadlinePassed: 'เลยกำหนดเวลาแล้ว',
  RevisionLimitReached: 'ขอแก้ครบจำนวนครั้งแล้ว เหลือปล่อยเงินหรือเปิดข้อพิพาท',
  DisputeRequired: 'เคยส่งงานแล้ว ต้องเปิดข้อพิพาทแทนการขอเงินคืน',
  // … ที่เหลือตามตารางหัวข้อ 8.4 ของ BACKEND_START_ver_0_2.md
}
const decoded = contract.interface.parseError(error.data)   // error.data เป็น hex ของ revert
const message = THAI[decoded?.name] ?? error.shortMessage
```

และเพิ่มกรณี `error.code === 'INSUFFICIENT_FUNDS'`

## 🟡 14. ข้อความ/ลิงก์ค้างของ ERC-20

- `EscrowPayment.jsx:383-390` ลิงก์ "เอกสาร ERC-20" ใช้ไม่ได้แล้ว (v2 เป็น native ETH)
- `EscrowPayment.jsx:259` ป้าย "5% · ตัวอย่าง" ควรเปลี่ยนเป็นค่าจาก `quote()`
- `contractConfig.js:67`, `contractService.js:57-71` และ `INTEGRATION.md` หัวข้อ 8 ("approve → depositEscrow", "สกุลเงิน native หรือ ERC-20", mapping สถานะ 4 ค่า) ควรปรับตาม v2

## 🟡 15. รายละเอียดเล็ก

- `getEscrow` ใน ethers v6 คืนเลข (รวม enum `status`) เป็น **`bigint`** เทียบ `=== 2` จะเป็น false ต้อง `Number(status)`
- address จาก MetaMask เป็นตัวพิมพ์เล็ก ใช้ `getAddress()` ก่อนเทียบกับ address ใน event/contract
- `parseUnits(String(amount), …)` กับตัวเลข float อาจได้สตริงทศนิยมยาว/เพี้ยน ให้คำนวณเป็น bigint ตามข้อ 5
- ESLint warning ที่ไม่ใช่บั๊ก (ตัวแปรที่ไม่ได้ใช้): `Hero3DScene.jsx:48`, `ClientProfile.jsx:15`, `SubmitProposal.jsx:25`, `FreelancerProfile.jsx:35`, `HowItWorks.jsx:23`
- `INTEGRATION.md` หัวข้อ 5 ระบุ `milestones: []` แต่ mock จริง (`hireProposal`) สร้าง 1 milestone ยอดเต็มชื่อ "ส่งมอบงาน" ซึ่งสอดคล้องกับ contract ที่จ่ายก้อนเดียว (ข้อ 4.9 ของคู่มือ)

---

## สิ่งที่ตรวจแล้ว **ถูกต้องดี** (ไม่ต้องแก้)

- Wallet: `connectWallet` ขอบัญชีจริง อ่าน `chainId` จริง ไม่รายงานว่าเชื่อมต่อจนกว่าจะได้บัญชี และ subscribe `accountsChanged`/`chainChanged` ถูกต้อง
- ทุก contract call ถูกปิดจน `isContractConfigured()` เป็นจริง และไม่มีทางแจ้ง "สำเร็จ" โดยไม่มี hash/receipt จริง (ตรงกับเจตนาใน `INTEGRATION.md` ข้อ 10 "ไม่มีปุ่มที่แจ้งสำเร็จปลอม")
- `executeTransaction` แยกสถานะ pending / confirmed / failed / rejected ชัด และจับ `ACTION_REJECTED`/4001
- ตรวจสิทธิ์ในหน้าด้วย `profileId` (ยกเว้นบั๊กข้อ 1) และมี service layer แยก mock/จริง ทำให้สลับ API ได้โดยไม่แตะ UI
- ค่าธรรมเนียม 5% บวกเพิ่มตรงกับ v2 อยู่แล้ว และ decimals 18 ตรงกับ ETH

## ลำดับที่แนะนำ

1. แก้ข้อ 1 (import เดียว) แล้ววางแผนข้อ 12 ให้เข้ากับเส้นทางส่งงาน/ตรวจรับ (ฝั่ง contract เสร็จแล้ว)
2. ข้อ 4-8: ตั้ง config, เขียน `contractService` ใหม่ (พร้อมกัน chain), เพิ่ม `walletAddress`, ตกลงที่มาของ `deadline`/`termsHash`/อัตราบาท→ETH
3. ข้อ 9-11: ต่อเส้นทางปกติ (ฝาก → accept → ส่งงาน → ปล่อยเงิน) พร้อม Backend ฟัง event แล้วค่อยเพิ่ม dispute/refund
4. ข้อ 13-15 ระหว่างทาง
5. ทดสอบบน Sepolia ด้วย wallet แยก client / freelancer / arbiter (ข้อ 4.7 ของคู่มือ)
