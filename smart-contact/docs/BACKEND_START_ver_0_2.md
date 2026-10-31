# Backend Starter — Solidity Escrow (Freelink) · native ETH · Escrow v2

เอกสารนี้อิงจาก `INTEGRATION.md` (หัวข้อ 1 และ 8) และจากโค้ด Frontend จริงในไฟล์ zip (`src/config/contractConfig.js`, `src/services/blockchain/*`, `src/pages/client/EscrowPayment.jsx`)
ครอบคลุมเฉพาะส่วน **Smart Contract (Solidity)** ที่เป็นงานของคุณ ส่วน REST API (`/jobs`, `/auth/me` ฯลฯ) เป็นงานของคนที่ทำ Backend/DB

> ⚠️ ชื่อฟังก์ชัน, event, ค่าธรรมเนียม และพารามิเตอร์เป็น **ข้อเสนอ** ที่ยังต้องตกลงกับทีม (ดูหัวข้อ 10)
> ✅ **Contract v2** compile ได้และผ่านเทสต์ **42 เคส** บน Hardhat 3 (รันจริง: Hardhat 3.21.1 + solc 0.8.24) และรัน `deploy.js` บนเครือข่ายจำลองสำเร็จ
> 🧪 ผมลอง "แกล้งแก้ contract ให้พัง" 4 จุด เทสต์จับได้ทุกจุด แปลว่าเทสต์ไม่ได้ผ่านเพราะหละหลวม
> 🚧 ยังไม่ได้ deploy จริงบน Sepolia และยังไม่ได้ทดสอบกับ Frontend จริง · ค่า policy ใหม่ (ช่วงตรวจรับ, timeout ของ arbiter) เป็นข้อเสนอที่ต้องให้ทีมยืนยัน (ดูหัวข้อ 10)
> ⛔ ยังไม่ผ่านการ audit ใช้ได้เฉพาะ testnet/demo ห้ามใช้กับเงินจริง

## สิ่งที่เปลี่ยนจากเวอร์ชันก่อน

| เรื่อง | เวอร์ชันก่อน | เวอร์ชันนี้ | เหตุผล |
| --- | --- | --- | --- |
| สกุลเงิน | ERC-20 (MockUSDC) | **native ETH บน Sepolia** | Frontend รองรับเฉพาะ native; ถ้าเป็น `erc20` จะ throw "ยังไม่ได้เตรียมลำดับ approve()" |
| การฝากเงิน | `approve` แล้วค่อย `depositEscrow` (2 ขั้น) | `depositEscrow` ขั้นเดียว แนบ ETH ไปกับ transaction | ผู้ใช้กดครั้งเดียว |
| ค่าธรรมเนียม | 2.5% หักจากยอดที่ freelancer ได้ | **5% บวกเพิ่มจากค่าจ้าง** (client จ่ายรวม 105%) | ตรงกับ `EscrowPayment.jsx`: `total = budget + fee` |
| `openDispute` | `(projectId)` | `(projectId, reason)` | Frontend ส่ง `reason` มาด้วย |
| ค่าธรรมเนียมกับ escrow เดิม | เปลี่ยน `feeBps` มีผลกับ escrow ที่ฝากไปแล้ว | **snapshot ตอนฝาก** | กันการเปลี่ยนค่าหลังฝากเงิน |
| เครื่องมือ | Hardhat v2 | **Hardhat v3** | เขียนใหม่ทั้งหมด: config เป็น `.ts`, โปรเจกต์เป็น ES module, `ethers`/network helpers มากับ network connection (ดูหัวข้อ 3, 6, 7) |
| ยอดค่าจ้าง | contract เดาจาก `msg.value` | client ระบุ `amount` เอง และต้องแนบ `amount + fee` พอดี | ค่าจ้างที่ตกลงต้องไม่ถูกคำนวณถอยหลัง (ข้อ 3 ในหัวข้อ 4.6) |
| คีย์ของ escrow | `projectId` | `escrowId = keccak256(client, projectId)` | คนอื่นจอง `projectId` ขวางไม่ได้ (ข้อ 2) |
| การยอมรับงาน | ไม่มี | freelancer ต้อง `acceptEscrow` พร้อมยืนยัน `termsHash` | ยืนยันว่าสองฝ่ายเห็นข้อตกลงฉบับเดียวกัน และ address ผิดไม่ทำให้เงินติด (ข้อ 4) |
| หลังส่งงาน | ล็อกสิทธิ์คืนเงินของ client ทันที | มี **ช่วงตรวจรับ**: client ปล่อย/ปฏิเสธภายในเวลา ไม่งั้น freelancer เบิกเอง | ส่งงานปลอมล็อกเงินถาวรไม่ได้ และ client หายก็ไม่ค้าง (ข้อ 1) |
| Dispute | ตัดสินได้ 100/0 · ไม่มี timeout | แบ่งสัดส่วน 0–100% · timeout → แบ่งครึ่ง · snapshot arbiter | ข้อ 5 |
| ผู้รับเงินที่ปฏิเสธ ETH | ทั้ง transaction ล้ม | บันทึกยอดค้างให้เบิกเอง (`withdraw`) | ผลต่อเนื่องจากการแบ่งเงินสองทาง (ข้อ 5e) |

---

## 1. ศัพท์พื้นฐานที่ควรรู้ (สำหรับมือใหม่)

| คำ | ความหมายแบบง่าย |
| --- | --- |
| **Mainnet** | เครือข่าย Ethereum จริง ETH มีมูลค่าจริง |
| **Testnet** | เครือข่ายไว้ทดลอง ETH ไม่มีมูลค่า เช่น **Sepolia** (Chain ID `11155111`) |
| **Faucet** | เว็บแจก testnet ETH ฟรี (ค้นหาคำว่า "Sepolia faucet") |
| **Gas** | ค่าธรรมเนียมของเครือข่ายที่จ่ายทุกครั้งที่ส่ง transaction (บน Sepolia จ่ายเป็น Sepolia ETH) |
| **Deploy** | การนำ contract ขึ้นไปวางบนเครือข่าย ได้ **Contract Address** กลับมา |
| **ABI** | "รายการเมนู" ของ contract บอกว่ามีฟังก์ชัน/event อะไร Frontend ต้องใช้ ABI ถึงเรียก contract ได้ |
| **wei** | หน่วยย่อยของ ETH: 1 ETH = 10¹⁸ wei (contract คิดเป็น wei เสมอ) |
| **msg.value** | จำนวน ETH ที่แนบมากับ transaction |
| **Event** | "ป้ายประกาศ" ที่ contract ส่งออกมาเมื่อมีเหตุการณ์ เช่น ฝากเงินสำเร็จ ให้ Frontend/Backend ฟังได้ |
| **Escrow** | ตัวกลางถือเงินไว้ จนกว่างานจะส่งมอบและตรวจรับ |
| **Arbiter** | ผู้ตัดสินเมื่อ client กับ freelancer ตกลงกันไม่ได้ (dispute) |
| **escrowId** | รหัสของ escrow แต่ละรายการ = hash ของ (ที่อยู่ client, projectId) ใช้เรียกทุกฟังก์ชันหลังฝากเงิน |
| **termsHash** | "ลายนิ้วมือ" (hash) ของข้อตกลงที่เก็บนอก chain เช่น ขอบเขตงานกับราคา ใช้พิสูจน์ว่าสองฝ่ายเห็นข้อตกลงเดียวกัน |
| **ช่วงตรวจรับ** | เวลาที่ client มีหลัง freelancer ส่งงาน เพื่อปล่อยเงินหรือปฏิเสธ ถ้าเงียบ เงินไปหา freelancer |
| **bps (basis points)** | หน่วย 1/100 ของ 1% : 500 bps = 5%, 10000 bps = 100% |

---

## 2. สิ่งที่เลือกใช้

| เรื่อง | ตัวเลือก | หมายเหตุ |
| --- | --- | --- |
| ภาษา | Solidity `0.8.24` | มี overflow check ในตัว |
| สกุลเงิน | **native ETH** | ไม่ต้อง approve ไม่ต้องมี token |
| Network สำหรับ demo | **Sepolia** (Chain ID `11155111`) | ไม่ใช้เงินจริง |
| Library | OpenZeppelin v5 | `Ownable`, `ReentrancyGuard` |
| เครื่องมือ | **Hardhat v3** (หรือ Remix IDE สำหรับเริ่มต้น) | ต้องใช้ Node.js ≥ 22.10 · Remix ไม่ต้องติดตั้งอะไร |
| Wallet | MetaMask | Frontend ใช้ `window.ethereum` |

---

## 3. โครงสร้างโปรเจกต์ (Hardhat 3)

> Hardhat 3 เขียนใหม่ทั้งหมด ใช้กับโปรเจกต์ Hardhat 2 ตรงๆ ไม่ได้ ถ้ามีโปรเจกต์เดิมอยู่ ให้สร้างโฟลเดอร์ใหม่ตามนี้ แล้วย้ายเฉพาะไฟล์ใน `contracts/` มา
> ข้อกำหนดหลัก: Node.js ≥ 22.10 · โปรเจกต์เป็น ES module (`"type": "module"` ใน `package.json`) · ไฟล์ config เป็น `hardhat.config.ts`

```
freelink-contracts/
├─ contracts/
│  ├─ FreelinkEscrow.sol
│  └─ mocks/
│     └─ FreelancerMock.sol   # ใช้ในเทสต์เท่านั้น
├─ scripts/
│  └─ deploy.js
├─ test/
│  └─ FreelinkEscrow.test.js
├─ hardhat.config.ts
├─ .env                        # เฉพาะค่าที่ไม่ลับ (ใช้ตอน deploy) ห้าม commit
├─ .env.example
├─ .gitignore
└─ package.json                # มี "type": "module"
```

### ติดตั้ง

```bash
node --version          # ต้องได้ v22.10 ขึ้นไป
mkdir freelink-contracts && cd freelink-contracts
npm init -y
npm pkg set type=module
npm install --save-dev hardhat@^3 @nomicfoundation/hardhat-toolbox-mocha-ethers dotenv
npm install @openzeppelin/contracts@^5
mkdir -p contracts scripts test
```

แล้วสร้างไฟล์ `hardhat.config.ts` ตามด้านล่าง (Hardhat 3 ไม่ต้องรัน `init` ก็เริ่มได้ แค่มีไฟล์ config)

> ผมลองรันคำสั่งติดตั้งข้างบนในโฟลเดอร์ว่างแล้ว ได้ Hardhat 3.21.1 ติดตั้งและ build/test ได้ ไม่ต้องรัน `npx hardhat --init` และไม่ติด peer dependency

### เก็บค่าลับด้วย keystore (แทน `.env`)

Hardhat 3 มี Configuration Variables และ keystore ในตัว ค่าลับจึงไม่ต้องเขียนลงไฟล์ในโปรเจกต์:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY      # ถ้าจะ verify บน Etherscan
```

- `SEPOLIA_RPC_URL` ขอฟรีได้จากผู้ให้บริการ RPC เช่น Alchemy หรือ Infura (สมัครแล้วสร้าง app เลือก Sepolia)
- `DEPLOYER_PRIVATE_KEY` ใช้ wallet ใหม่สำหรับ testnet โดยเฉพาะ **ห้ามใช้ key ของ wallet ที่มีเงินจริง**
- Hardhat จะถามรหัสผ่านของ keystore เมื่อต้องใช้ค่าเหล่านี้ (เช่นตอน `--network sepolia`) ส่วน `build` และ `test` บนเครือข่ายจำลองไม่ต้องใช้ ผมรันยืนยันแล้วโดยไม่ได้ตั้งค่าเหล่านี้

### `.env.example` (ค่าที่ไม่ลับ ใช้ใน `scripts/deploy.js`)

```env
ARBITER_ADDRESS=
FEE_RECIPIENT_ADDRESS=
FEE_BPS=500
REVIEW_PERIOD_SECONDS=604800     # ช่วงตรวจรับหลังส่งงาน (7 วัน)
ARBITER_TIMEOUT_SECONDS=1209600  # เวลาที่ arbiter มีเพื่อตัดสิน (14 วัน)
```

### `.gitignore`

```
node_modules
.env
artifacts
cache
coverage
```

### `hardhat.config.ts`

```ts
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  // Hardhat 3: ต้องทั้ง import และใส่ plugin ในลิสต์นี้
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    sepolia: {
      type: "http", // Hardhat 3 บังคับระบุชนิดของ network
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: { apiKey: configVariable("ETHERSCAN_API_KEY") },
  },
});
```

---

## 4. ออกแบบ Escrow ให้ตรงกับ Frontend

### 4.1 เงินไหลอย่างไร (ตัวอย่าง: ค่าจ้าง 1 ETH, ค่าธรรมเนียม 5%)

| ขั้นตอน | ใครจ่าย / ใครได้ |
| --- | --- |
| ฝาก | client ระบุค่าจ้าง `amount` = 1 ETH แล้วแนบ **1.05 ETH** (ค่าจ้าง + ค่าธรรมเนียม `amount × feeBps ÷ 10000`) ถ้าแนบไม่ตรงเป๊ะ transaction จะล้ม |
| ปล่อยเงิน (client กด หรือ freelancer เบิกหลังพ้นช่วงตรวจรับ) | freelancer ได้ **1 ETH**, แพลตฟอร์ม (`feeRecipient`) ได้ **0.05 ETH** |
| คืนเงิน (refund) | client ได้คืน **1.05 ETH เต็มจำนวน** |
| arbiter ตัดสินแบ่ง เช่น freelancer 60% | freelancer **0.6** · แพลตฟอร์ม **0.03** (ค่าธรรมเนียมคิดตามสัดส่วนที่จ่ายจริง) · client **0.42** (0.4 + ค่าธรรมเนียมส่วนที่เหลือ 0.02) |
| arbiter เงียบเกินกำหนด → แบ่งครึ่ง | freelancer **0.5** · แพลตฟอร์ม **0.025** · client **0.525** |

ค่าธรรมเนียมถูกเก็บ (snapshot) ตอนฝาก การที่ owner เปลี่ยน `feeBps` ภายหลังไม่กระทบ escrow ที่ฝากไปแล้ว

### 4.2 ลำดับสถานะ

| จาก | ฟังก์ชัน (ผู้เรียก) | ไป |
| --- | --- | --- |
| *(ยังไม่มี)* | `depositEscrow` (client) | `Funded` |
| `Funded` | `acceptEscrow` (freelancer) | `Active` |
| `Funded` | `refundClient` (client หรือ freelancer ทุกเมื่อ) | `Refunded` |
| `Active` | `submitWork` (freelancer ก่อน deadline) | `Submitted` |
| `Active` | `releasePayment` (client) | `Released` |
| `Active` | `refundClient` (freelancer ทุกเมื่อ / client หลัง deadline) | `Refunded` |
| `Active` | `openDispute` (client, หรือ freelancer ก่อน deadline) | `Disputed` |
| `Submitted` | `releasePayment` (client) หรือ `claimAfterReview` (freelancer หลังพ้นช่วงตรวจรับ) | `Released` |
| `Submitted` | `openDispute` (client ภายในช่วงตรวจรับ = ปฏิเสธงาน) | `Disputed` |
| `Submitted` | `refundClient` (freelancer ยอมยกเลิก) | `Refunded` |
| `Disputed` | `resolveDispute` (arbiter) หรือ `settleExpiredDispute` (คู่กรณี หลังพ้น timeout) | `Resolved` |

On-chain `Status` → UI:

| On-chain `Status` | `escrowStatus` ใน UI | หมายเหตุ |
| --- | --- | --- |
| `Unfunded` (0) | `unfunded` | ยังไม่มีการฝาก (ค่าเริ่มต้น) |
| `Funded` (1) | `funded` | ฝากแล้ว **รอ freelancer ยอมรับ** |
| `Active` (2) | `funded` + project `in_progress` | freelancer ยอมรับแล้ว กำลังทำงาน |
| `Submitted` (3) | `funded` + project `in_review` | ส่งงานแล้ว UI ควรแสดงนับถอยหลังถึง `reviewEndsAt` |
| `Disputed` (4) | `funded` + project `disputed` | เงินอยู่ใน contract รอ arbiter |
| `Released` (5) | `released` | จ่ายให้ freelancer เต็มจำนวนแล้ว |
| `Refunded` (6) | `refunded` | คืนให้ client เต็มจำนวนแล้ว |
| `Resolved` (7) | **ใหม่** (หรือแมปตาม `payoutBps`) | ปิดด้วยคำตัดสิน ดู `payoutBps` (10000 = freelancer ได้ทั้งหมด, 0 = client ได้ทั้งหมด, อื่นๆ = แบ่ง) |

> ⚠️ ตัวเลข enum เปลี่ยนจากร่างก่อน (เดิม `Released` = 2, `Refunded` = 3) ถ้า Frontend ฮาร์ดโค้ดเลข ต้องแก้ตามตารางนี้

### 4.3 ใครเรียกอะไรได้

| ฟังก์ชัน | ผู้เรียก | เงื่อนไข |
| --- | --- | --- |
| `depositEscrow` (payable) | client | ไม่เคยมี escrow ของ (client, `projectId`) นี้ · `msg.value` = `amount + fee` พอดี · freelancer ไม่ใช่ตัวเอง · deadline อยู่ในอนาคตไม่เกิน 1 ปี · `termsHash` ไม่ว่าง · arbiter ไม่ใช่คู่กรณี |
| `acceptEscrow` | freelancer | `Funded` · `termsHash` ตรงกับที่ client ผูกไว้ · ยังไม่ถึง deadline |
| `submitWork` | freelancer | `Active` · ไม่เกิน deadline |
| `releasePayment` | client | `Active` หรือ `Submitted` |
| `claimAfterReview` | freelancer | `Submitted` และพ้น `reviewEndsAt` |
| `refundClient` | ดูตาราง 4.2 | `Funded` / `Active` / `Submitted` (client ขอคืนเองตอน `Submitted` ไม่ได้) |
| `openDispute` | client หรือ freelancer | ดูตาราง 4.2 (freelancer เปิดตอน `Submitted` หรือหลัง deadline ไม่ได้) |
| `resolveDispute(escrowId, freelancerBps)` | arbiter ที่ถูกบันทึกตอนเปิด dispute | `Disputed` · `freelancerBps` ไม่เกิน 10000 |
| `settleExpiredDispute` | client หรือ freelancer | `Disputed` และพ้น `arbiterTimeout` |
| `withdraw` | ใครก็ได้ที่มียอดค้าง | `pendingWithdrawals[ตัวเอง]` > 0 |
| `setFeeBps` / `setArbiter` / `setFeeRecipient` | owner (คน deploy) | `feeBps` ไม่เกิน 10% · มีผลกับ escrow/dispute ที่เกิดหลังจากนั้นเท่านั้น |
| `computeEscrowId` / `quote` / `getEscrow` | ใครก็ได้ (อ่านอย่างเดียว) | — |

### 4.4 Event → UI

| Event | Frontend/Backend ควรทำอะไร |
| --- | --- |
| `EscrowFunded` | เก็บ `escrowId` ผูกกับโปรเจกต์ (หลังตรวจว่า client/freelancer/`termsHash` ตรงกับงานใน DB) · `escrowStatus = funded` · แจ้ง freelancer ให้ยอมรับ |
| `EscrowAccepted` | project `in_progress` |
| `WorkSubmitted` | แจ้ง client ว่ามีงานรอตรวจ (project `in_review`) พร้อมเวลา `reviewEndsAt` |
| `PaymentReleased` | project `completed`, `escrowStatus = released` (เกิดทั้งจาก client ปล่อยเอง และ freelancer เบิกหลังช่วงตรวจรับ) |
| `EscrowRefunded` | `escrowStatus = refunded` |
| `DisputeOpened` | project `disputed` (มี `reason`, `openedBy`, `arbiter`) |
| `DisputeResolved` | ปิดข้อพิพาท: ใช้ `toFreelancer` / `toClient` / `feePaid` และ `byTimeout` แสดงผล **ไม่มี** `PaymentReleased`/`EscrowRefunded` ตามมา |
| `PayoutDeferred` / `Withdrawn` | ผู้รับเป็น contract ที่ปฏิเสธ ETH → ยอดค้างรอเบิก / เบิกแล้ว |
| `FeeBpsUpdated` / `ArbiterUpdated` / `FeeRecipientUpdated` | แจ้งเตือนผู้ดูแลระบบ (ควรมีการเฝ้าดู) |

### 4.5 รหัสที่ใช้ (`projectId`, `escrowId`, `termsHash`)

Contract ใช้ `bytes32` แต่ Frontend ตอนนี้ส่ง `project.id` เป็น string ตรงๆ ต้องแปลงทุกครั้งด้วยวิธีเดียวกันทุกฝั่ง:

```js
// ethers v6
import { id, keccak256, AbiCoder } from "ethers";

const projectIdBytes32 = id(project.id); // keccak256 ของข้อความ

// escrowId: ให้ contract คำนวณเอง (แนะนำ ไม่ต้องกลัวสูตรไม่ตรง)
const escrowId = await contract.computeEscrowId(clientAddress, projectIdBytes32);
// หรือคำนวณเองได้ ผลต้องเท่ากัน
const same = keccak256(AbiCoder.defaultAbiCoder().encode(["address", "bytes32"], [clientAddress, projectIdBytes32]));

// termsHash: hash ของข้อตกลงฉบับที่ทั้งสองฝ่ายเห็นตรงกัน (ทีมต้องตกลงสูตร ดูหัวข้อ 10)
// ตัวอย่าง: เก็บ JSON ข้อตกลงใน DB แล้ว hash ข้อความนั้น เพื่อให้ arbiter เปิดข้อความต้นฉบับมาเทียบได้
const termsHash = id(JSON.stringify({ title, scope, amountEth, deadline }));
```

ฟังก์ชันที่เหลือทั้งหมดหลังฝากเงินใช้ `escrowId` (ไม่ใช่ `projectId`) ดังนั้น **ฝั่ง freelancer ต้องรู้ address ของ client** (จาก DB หรือจาก event `EscrowFunded`) จึงจะคำนวณ `escrowId` ได้

### 4.6 เหตุและผลของการออกแบบ v2

หัวข้อนี้อธิบายว่า "ทำไมแก้แบบนี้" เรียงตามช่องโหว่ที่เจอใน v1 ทุกข้อมีเทสต์รองรับในหัวข้อ 6

#### ข้อ 1 — freelancer ส่งงานปลอมเพื่อล็อกสิทธิ์คืนเงินของ client

- **เหตุ:** ใน v1 `submitWork` เรียกได้ทุกเมื่อด้วย hash อะไรก็ได้ และพอเรียกแล้ว client ขอเงินคืนหลัง deadline ไม่ได้อีก freelancer จึงไม่ต้องทำงานจริงก็บังคับให้ client ต้องไปพึ่ง arbiter ได้
- **ผล (สิ่งที่ทำ):** การส่งงานเริ่มนับ **ช่วงตรวจรับ** (`reviewPeriod`) client เลือกได้สองทางภายในเวลานั้น คือ `releasePayment` หรือ `openDispute` (= ปฏิเสธงาน) ถ้าเงียบ freelancer เบิกเองด้วย `claimAfterReview`
- **ทำไมเลือกทางนี้:** ส่งงานปลอมทำได้อย่างมากแค่ทำให้เกิด dispute ไม่ใช่ล็อกเงินถาวร ส่วน client ที่หายไปก็ไม่ทำให้ freelancer ค้างเงินตลอดไป (ปิดช่องที่ v1 ปล่อยไว้ในหัวข้อ 10)
- **ข้อแลกเปลี่ยน:** client ต้องเข้ามาตอบภายในเวลาที่กำหนด (ค่าเริ่มต้น 7 วัน) UI ต้องแจ้งเตือน · `deadline` กลายเป็น "เส้นตายส่งงาน" ส่งช้าไปแม้วินาทีเดียวจะส่งผ่าน contract ไม่ได้ (client ยังปล่อยเงินให้งานที่ส่งช้านอกระบบได้) · ส่งงานได้ครั้งเดียว ถ้าไม่พอใจต้องเปิด dispute (ยังไม่มีขั้น "ขอแก้งาน")

#### ข้อ 2 — ใครก็จอง `projectId` ได้

- **เหตุ:** v1 ใช้ `projectId` เป็นคีย์ตรงๆ ใครฝากก่อนได้สิทธิ์ ถ้า ID เดาง่าย (เช่น `p1`, `p2`) คนร้ายฝากเงินจิ๋วล่วงหน้า client ตัวจริงจะฝากไม่ได้ (`AlreadyExists`) และต้นทุนของคนร้ายคือค่า gas เท่านั้น เพราะเขาขอคืนเงินของตัวเองได้
- **ผล:** คีย์เปลี่ยนเป็น `escrowId = keccak256(client, projectId)` ที่ contract คำนวณเอง ทุกคนมี "พื้นที่ชื่อ" ของตัวเอง
- **ทำไมเลือกทางนี้:** ทางอื่นคือให้ Backend เซ็นลายเซ็นอนุมัติทุกการฝาก ซึ่งปลอดภัยกว่าแต่ต้องมี key และบริการเซ็นเพิ่ม เกินความจำเป็นสำหรับ demo ส่วนวิธีนี้ตัดการชนกันได้เด็ดขาดโดยไม่ต้องมีอะไรเพิ่ม
- **ข้อแลกเปลี่ยน:** contract ไม่รู้ว่า escrow ไหนคือ "ของจริง" ของงานใน DB ดังนั้น **Backend/UI ต้องตรวจ** `EscrowFunded` ว่า `client`, `freelancer`, `termsHash` ตรงกับงานก่อนเชื่อ (คนอื่นฝากด้วย `projectId` เดียวกันได้ แต่จะได้ escrow ที่ไม่มีใครผูกกับงานจริง) · escrow หนึ่งชุดต่อ (client, `projectId`) ตลอดไป ถ้าจะฝากใหม่ต้องใช้ `projectId` ใหม่

#### ข้อ 3 — ยอดค่าจ้างถูกเดาจาก `msg.value`

- **เหตุ:** v1 ไม่รู้ว่าตกลงค่าจ้างเท่าไร มันแยกค่าธรรมเนียมออกจาก `msg.value` ด้วย `feeBps` ณ เวลานั้น ถ้า client แนบมาผิด หรือ owner ปรับ `feeBps` ก่อน transaction ถูกบันทึก freelancer จะได้เงินไม่ตรงที่ตกลง
- **ผล:** `depositEscrow` รับ `amount` เป็นพารามิเตอร์ และต้องแนบ `amount + fee` พอดี ไม่เช่นนั้น revert `WrongPayment(expected, sent)` มี `quote(amount)` ให้ UI ถามยอดที่ต้องแนบจาก contract โดยตรง
- **ทำไมเลือกทางนี้:** "ค่าจ้าง" ควรเป็นค่าที่ผู้ใช้ตั้งใจระบุ ไม่ใช่ค่าที่คำนวณย้อนกลับ และเมื่อสูตรเปลี่ยนระหว่างทาง การที่ transaction **ล้ม** ปลอดภัยกว่าการจ่ายผิดยอดเงียบๆ
- **ข้อแลกเปลี่ยน:** UI ต้องเรียก `quote` ก่อนทุกครั้ง ถ้า owner เปลี่ยนค่าธรรมเนียมจังหวะเดียวกัน client ต้องกดใหม่

#### ข้อ 4 — ไม่มีขั้นที่ freelancer ยืนยันเงื่อนไข

- **เหตุ:** client เลือก freelancer ยอด และ deadline ฝ่ายเดียว freelancer ไม่เคยยืนยันบน chain และถ้า client ใส่ address freelancer ผิด เงินติดจนถึง deadline
- **ผล:** เพิ่มสถานะ `Funded → Active` ผ่าน `acceptEscrow(escrowId, termsHash)` client ฝากพร้อม `termsHash` ของข้อตกลง freelancer ต้องส่ง hash เดียวกันจึงยอมรับได้ **ก่อน accept ทั้งสองฝ่ายขอคืนเงินเต็มได้ทันที**
- **ทำไมเลือกทางนี้:** contract ตัดสินคุณภาพงานไม่ได้ แต่พิสูจน์ได้ว่า "สองฝ่ายเห็นข้อตกลงฉบับเดียวกัน" ซึ่ง arbiter ใช้เป็นหลักฐานอ้างอิงได้ ส่วนทางออกก่อน accept ทำให้ address ผิดไม่ทำให้เงินติดอีก (แก้ปัญหาที่ผมเคยแยกเป็นข้อ 9 ไปพร้อมกัน) และมีเพดาน `deadline` ไม่เกิน 365 วันกัน deadline ไกลเกินจริง
- **ข้อแลกเปลี่ยน:** freelancer ต้องจ่าย gas เพิ่ม 1 ธุรกรรม · ทีมต้องตกลงสูตร `termsHash` และเก็บข้อความต้นฉบับไว้เปิดเทียบได้

#### ข้อ 5 — ระบบ dispute แข็งเกินไป (แยกเป็นหลายเหตุ)

**5a. ตัดสินได้แค่ "ให้ freelancer ทั้งหมด" หรือ "คืน client ทั้งหมด"**
- **เหตุ:** งานจริงมักเสร็จบางส่วน ตัดสินได้แค่ขาวหรือดำทำให้ arbiter ต้องเลือกฝ่ายที่ "ผิดน้อยกว่า"
- **ผล:** `resolveDispute(escrowId, freelancerBps)` กำหนดสัดส่วน 0–10000 ค่าธรรมเนียมคิดตามสัดส่วนเดียวกัน (แพลตฟอร์มได้เฉพาะงานที่จ่ายออกไปจริง) ส่วนที่เหลือเป็นของ client เศษที่ปัดตกให้ client เพื่อไม่ให้ wei หายหรือค้าง
- **ทำไมเลือกทางนี้:** ที่ 100% ผลเท่ากับ `releasePayment` ที่ 0% เท่ากับ `refundClient` พอดี จึงไม่ต้องมีกรณีพิเศษแยก (เทสต์ตรวจ 30 ชุด: 5 ยอด × 6 สัดส่วน ว่ารวมแล้วเท่ายอดฝากทุก wei)

**5b. arbiter หาย เงินค้างตลอดไป**
- **เหตุ:** v1 ไม่มีทางออกถ้า arbiter ไม่ตัดสิน
- **ผล:** หลังพ้น `arbiterTimeout` (ค่าเริ่มต้น 14 วัน) คู่กรณีฝ่ายใดก็สั่ง `settleExpiredDispute` ได้ ผลคือ **แบ่งครึ่ง**
- **ทำไมเลือก 50/50:** ถ้าค่าเริ่มต้นเอนไปทางฝ่ายใดฝ่ายหนึ่ง ฝ่ายนั้นจะมีแรงจูงใจให้ arbiter เงียบหรือถ่วงเวลา การแบ่งครึ่งทำให้ไม่มีใครได้ประโยชน์จากความเงียบ ทั้งสองฝ่ายจึงอยากให้ arbiter ตัดสิน
- **ข้อแลกเปลี่ยน:** 50/50 ไม่ใช่การตัดสินที่ถูกต้อง แค่เป็นทางออกที่เป็นกลาง ค่า timeout ตั้งตอน deploy และแก้ภายหลังไม่ได้ (`immutable`) เพื่อไม่ให้ owner เปลี่ยนกติกากลางทาง

**5c. owner เปลี่ยน arbiter ระหว่างที่ dispute ค้างอยู่**
- **เหตุ:** ถ้าเปลี่ยนได้กลางคัน owner เลือกผู้ตัดสินให้ข้อพิพาทที่ตัวเองสนใจได้
- **ผล:** บันทึก arbiter ณ ตอน **เปิด** dispute (snapshot) การ `setArbiter` ภายหลังมีผลเฉพาะ dispute ใหม่
- **ข้อแลกเปลี่ยน:** ถ้ากุญแจของ arbiter เก่ารั่ว dispute ที่เปิดไปแล้วต้องรอ timeout

**5d. arbiter เป็นคู่กรณีของ escrow นั้นเอง**
- **เหตุ:** arbiter ที่เป็น client หรือ freelancer ของงานนั้นจะตัดสินให้ตัวเองได้
- **ผล:** ตรวจทั้งตอนฝากและตอนเปิด dispute ถ้าเป็นคู่กรณี revert `ConflictOfInterest`

**5e. ผู้รับฝ่ายเดียวที่ปฏิเสธ ETH ขวางเงินอีกฝ่าย (ผลต่อเนื่องจาก 5a)**
- **เหตุ:** พอการตัดสินแบ่งเงินสองทาง ถ้าผู้รับฝ่ายหนึ่งเป็น contract ที่ปฏิเสธ ETH การโอนที่ล้มจะทำให้ทั้ง transaction ล้ม ส่วนของอีกฝ่ายก็ค้างไปด้วย (ใน v1 ฝั่ง `feeRecipient` ก็มีปัญหาเดียวกัน)
- **ผล:** ถ้าโอนไม่สำเร็จ contract จะ **บันทึกเป็นยอดค้าง** (`pendingWithdrawals`) แล้วไปต่อ ผู้รับมาเบิกเองด้วย `withdraw()` และมี `nonReentrant` กัน re-entrancy
- **ข้อแลกเปลี่ยน:** กระเป๋าปกติ (EOA) ได้เงินทันทีเหมือนเดิม เฉพาะ contract ที่ปฏิเสธเท่านั้นที่ต้องมาเบิกเอง

**5f. ไม่ให้ dispute กลายเป็นเครื่องมือขวาง**
- **เหตุ:** ถ้า freelancer ที่ไม่ได้ทำงานเปิด dispute หลัง deadline ได้ เขาจะแย่งตัดหน้าสิทธิ์ขอคืนเงินของ client แล้วรอ timeout เพื่อเอา 50% ได้
- **ผล:** freelancer เปิด dispute ได้เฉพาะตอน `Active` และ **ก่อน deadline** ส่วนตอน `Submitted` เปิดเองไม่ได้ (ใช้ `claimAfterReview`) ฝั่ง client เปิดได้ตอน `Submitted` ภายในช่วงตรวจรับเท่านั้น เพื่อให้ freelancer มั่นใจว่าพ้นช่วงนั้นแล้วเงินเป็นของตน

#### สิ่งที่ยังเปิดอยู่ในดีไซน์นี้

- freelancer ที่เปิด dispute ก่อน deadline ตอน `Active` แล้วหวังให้ arbiter เงียบ จะได้ 50% เมื่อ timeout จึงต้องมี arbiter ที่ตอบสนองจริง ซึ่งเป็นเรื่องกระบวนการ ไม่ใช่เรื่องโค้ด
- arbiter ยังเป็นจุดรวมศูนย์ที่ต้องไว้ใจ ควรเป็น multisig เมื่อขึ้น production
- ยังไม่มี milestone, การขอแก้งาน, หรือการขยาย deadline

---

## 5. โค้ด Contract

### `contracts/FreelinkEscrow.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FreelinkEscrow v2
/// @notice Escrow สำหรับค่าจ้างงาน Freelance แบบ native ETH — เวอร์ชัน demo ยังไม่ผ่าน audit
/// @dev ลำดับสถานะ:
///      Funded (client ฝากแล้ว รอ freelancer ยอมรับ)
///        → Active (freelancer ยอมรับเงื่อนไขแล้ว)
///        → Submitted (ส่งงานแล้ว เริ่มนับช่วงตรวจรับ)
///        → Released | Refunded | Disputed → Resolved
///      client จ่าย "ค่าจ้าง + ค่าธรรมเนียม" ใน msg.value ตอนฝาก โดยระบุ amount (ค่าจ้าง) เอง
///      ถ้า msg.value ไม่เท่ากับ amount + fee ณ ขณะนั้น transaction จะ revert (ไม่เดาแทน client)
contract FreelinkEscrow is Ownable, ReentrancyGuard {
    // ---------- Types ----------
    enum Status {
        Unfunded,  // 0: ยังไม่มี escrow (ค่าเริ่มต้นของ mapping)
        Funded,    // 1: ฝากแล้ว รอ freelancer ยอมรับเงื่อนไข
        Active,    // 2: freelancer ยอมรับแล้ว กำลังทำงาน
        Submitted, // 3: ส่งงานแล้ว อยู่ในช่วงตรวจรับ
        Disputed,  // 4: มีข้อพิพาท เงินรอ arbiter
        Released,  // 5: จ่ายให้ freelancer เต็มจำนวนแล้ว
        Refunded,  // 6: คืนให้ client เต็มจำนวนแล้ว
        Resolved   // 7: ปิดด้วยคำตัดสิน (arbiter หรือ timeout) ดู payoutBps
    }

    struct Escrow {
        address client;
        address freelancer;
        address arbiter;      // snapshot ตอนเปิด dispute (ก่อนหน้านั้นเป็น address(0))
        uint256 amount;       // ค่าจ้าง (wei) ที่ client ระบุตอนฝาก
        uint256 fee;          // ค่าธรรมเนียมแพลตฟอร์ม (wei) snapshot ตอนฝาก
        bytes32 termsHash;    // hash ของข้อตกลงที่เก็บ off-chain (ทั้งสองฝ่ายต้องยืนยันค่าเดียวกัน)
        uint64 deadline;      // เส้นตายส่งงาน (unix)
        uint64 reviewEndsAt;  // เวลาที่ช่วงตรวจรับสิ้นสุด (ตั้งตอนส่งงาน)
        uint64 disputedAt;    // เวลาที่เปิด dispute
        uint16 payoutBps;     // สัดส่วนค่าจ้างที่ freelancer ได้จริง (ตั้งตอนปิด escrow, 10000 = ทั้งหมด)
        Status status;
    }

    // ---------- Constants / immutables ----------
    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 1000;           // เพดานค่าธรรมเนียม 10%
    uint64 public constant MAX_DURATION = 365 days;      // deadline ห่างจากวันฝากได้ไม่เกิน 1 ปี
    uint16 public constant TIMEOUT_FREELANCER_BPS = 5000; // arbiter เงียบเกินกำหนด → แบ่งครึ่ง

    uint64 public immutable reviewPeriod;    // ช่วงที่ client ตรวจรับหลังส่งงาน
    uint64 public immutable arbiterTimeout;  // เวลาที่ arbiter มีเพื่อตัดสินหลังเปิด dispute

    // ---------- State ----------
    address public arbiter;
    address public feeRecipient;
    uint16 public feeBps; // 500 = 5% ของค่าจ้าง

    mapping(bytes32 => Escrow) private escrows;
    mapping(address => uint256) public pendingWithdrawals; // เงินที่โอนไม่สำเร็จ รอผู้รับมาเบิกเอง

    // ---------- Errors ----------
    error NotAuthorized();
    error InvalidStatus();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidDeadline();
    error InvalidDuration();
    error InvalidTerms();
    error InvalidShare();
    error AlreadyExists();
    error WrongPayment(uint256 expected, uint256 sent);
    error NotYetRefundable();
    error DeadlinePassed();
    error ReviewPeriodActive();
    error ReviewPeriodOver();
    error DisputeNotExpired();
    error ConflictOfInterest();
    error FeeTooHigh();
    error TransferFailed();

    // ---------- Events ----------
    event EscrowFunded(
        bytes32 indexed escrowId,
        bytes32 indexed projectId,
        address indexed client,
        address freelancer,
        uint256 amount,
        uint256 fee,
        uint64 deadline,
        bytes32 termsHash
    );
    event EscrowAccepted(bytes32 indexed escrowId, address indexed freelancer);
    event WorkSubmitted(bytes32 indexed escrowId, address indexed freelancer, bytes32 workHash, uint64 reviewEndsAt);
    event PaymentReleased(
        bytes32 indexed escrowId,
        address indexed freelancer,
        uint256 amountToFreelancer,
        uint256 fee
    );
    event EscrowRefunded(bytes32 indexed escrowId, address indexed client, uint256 amount);
    event DisputeOpened(bytes32 indexed escrowId, address indexed openedBy, string reason, address arbiter);
    event DisputeResolved(
        bytes32 indexed escrowId,
        uint16 freelancerBps,
        uint256 toFreelancer,
        uint256 toClient,
        uint256 feePaid,
        bool byTimeout
    );
    event PayoutDeferred(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event ArbiterUpdated(address indexed oldArbiter, address indexed newArbiter);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    constructor(
        address arbiter_,
        address feeRecipient_,
        uint16 feeBps_,
        uint64 reviewPeriod_,
        uint64 arbiterTimeout_
    ) Ownable(msg.sender) {
        if (arbiter_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (reviewPeriod_ == 0 || reviewPeriod_ > 30 days) revert InvalidDuration();
        if (arbiterTimeout_ == 0 || arbiterTimeout_ > 90 days) revert InvalidDuration();
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        reviewPeriod = reviewPeriod_;
        arbiterTimeout = arbiterTimeout_;
    }

    // ---------- Client ----------

    /// @notice ฝากเงินเข้า escrow — msg.value ต้องเท่ากับ amount + fee พอดี (ดู quote())
    /// @param projectId  รหัสโปรเจกต์ (keccak256 ของ project.id ฝั่ง Frontend)
    /// @param termsHash  hash ของข้อตกลง (ขอบเขตงาน/ราคา) ที่ freelancer ต้องยืนยันตอน accept
    /// @param amount     ค่าจ้างที่ freelancer จะได้รับ (wei) — ค่าธรรมเนียมบวกเพิ่มจากนี้
    /// @return escrowId  คีย์ของ escrow = keccak256(client, projectId) ใช้กับทุกฟังก์ชันที่เหลือ
    function depositEscrow(
        bytes32 projectId,
        address freelancer,
        uint64 deadline,
        bytes32 termsHash,
        uint256 amount
    ) external payable returns (bytes32 escrowId) {
        if (amount == 0) revert InvalidAmount();
        if (termsHash == bytes32(0)) revert InvalidTerms();
        if (freelancer == address(0) || freelancer == msg.sender) revert InvalidAddress();
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_DURATION) revert InvalidDeadline();
        if (arbiter == msg.sender || arbiter == freelancer) revert ConflictOfInterest();

        escrowId = computeEscrowId(msg.sender, projectId);
        Escrow storage e = escrows[escrowId];
        if (e.client != address(0)) revert AlreadyExists();

        uint256 fee = (amount * feeBps) / BPS;
        if (msg.value != amount + fee) revert WrongPayment(amount + fee, msg.value);

        e.client = msg.sender;
        e.freelancer = freelancer;
        e.amount = amount;
        e.fee = fee;
        e.termsHash = termsHash;
        e.deadline = deadline;
        e.status = Status.Funded;

        emit EscrowFunded(escrowId, projectId, msg.sender, freelancer, amount, fee, deadline, termsHash);
    }

    /// @notice client ตรวจรับงานแล้วปล่อยเงินให้ freelancer (ทำได้ทันทีที่ freelancer ยอมรับงานแล้ว)
    function releasePayment(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client) revert NotAuthorized();
        if (e.status != Status.Active && e.status != Status.Submitted) revert InvalidStatus();
        _releaseToFreelancer(escrowId, e);
    }

    // ---------- Freelancer ----------

    /// @notice ยอมรับงาน — ต้องส่ง termsHash เดียวกับที่ client ผูกไว้ตอนฝาก เพื่อยืนยันว่าเห็นเงื่อนไขเดียวกัน
    function acceptEscrow(bytes32 escrowId, bytes32 termsHash) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        if (termsHash != e.termsHash) revert InvalidTerms();
        if (block.timestamp >= e.deadline) revert DeadlinePassed();
        e.status = Status.Active;
        emit EscrowAccepted(escrowId, msg.sender);
    }

    /// @notice แจ้งว่าส่งงานแล้ว (workHash = hash ของลิงก์/ไฟล์ off-chain) ต้องส่งก่อน deadline
    ///         เริ่มนับช่วงตรวจรับ: client ต้องปล่อยเงินหรือเปิด dispute ภายใน reviewPeriod
    function submitWork(bytes32 escrowId, bytes32 workHash) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Active) revert InvalidStatus();
        if (block.timestamp > e.deadline) revert DeadlinePassed();
        e.status = Status.Submitted;
        e.reviewEndsAt = uint64(block.timestamp) + reviewPeriod;
        emit WorkSubmitted(escrowId, msg.sender, workHash, e.reviewEndsAt);
    }

    /// @notice client เงียบหลังส่งงานจนพ้นช่วงตรวจรับ → freelancer เบิกเงินเองได้
    function claimAfterReview(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Submitted) revert InvalidStatus();
        if (block.timestamp <= e.reviewEndsAt) revert ReviewPeriodActive();
        _releaseToFreelancer(escrowId, e);
    }

    // ---------- Refund ----------

    /// @notice คืนเงินให้ client เต็มจำนวนรวมค่าธรรมเนียม
    ///  - ยังไม่ accept (Funded): client หรือ freelancer เรียกได้ทุกเมื่อ (ยกเลิก / ปฏิเสธรับงาน)
    ///  - freelancer เรียกได้ทุกเมื่อก่อนจบงาน (ยอมยกเลิก)
    ///  - client เรียกได้หลัง deadline ถ้ายังทำงานอยู่ (Active) — หลังส่งงานแล้วต้องใช้ openDispute
    function refundClient(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        Status s = e.status;
        if (s != Status.Funded && s != Status.Active && s != Status.Submitted) revert InvalidStatus();

        if (msg.sender == e.freelancer) {
            // ok
        } else if (msg.sender == e.client) {
            if (s == Status.Submitted) revert InvalidStatus();
            if (s == Status.Active && block.timestamp <= e.deadline) revert NotYetRefundable();
        } else {
            revert NotAuthorized();
        }

        (, uint256 toClient, ) = _settle(e, 0, Status.Refunded);
        emit EscrowRefunded(escrowId, e.client, toClient);
    }

    // ---------- Dispute ----------

    /// @notice เปิดข้อพิพาท (reason เป็นข้อความสั้นๆ ที่ปรากฏใน event ถาวร อย่าใส่ข้อมูลส่วนตัว)
    ///  - client: ตอน Active หรือตอน Submitted ภายในช่วงตรวจรับ (นี่คือการ "ปฏิเสธงาน")
    ///  - freelancer: ตอน Active และก่อน deadline เท่านั้น (กันไม่ให้ขวางสิทธิ์คืนเงินของ client หลัง deadline)
    ///  arbiter ถูก snapshot ณ ตอนเปิด ไม่ถูกเปลี่ยนกลางคันโดย owner
    function openDispute(bytes32 escrowId, string calldata reason) external {
        Escrow storage e = escrows[escrowId];
        Status s = e.status;

        if (msg.sender == e.client) {
            if (s == Status.Submitted) {
                if (block.timestamp > e.reviewEndsAt) revert ReviewPeriodOver();
            } else if (s != Status.Active) {
                revert InvalidStatus();
            }
        } else if (msg.sender == e.freelancer) {
            if (s != Status.Active) revert InvalidStatus();
            if (block.timestamp > e.deadline) revert DeadlinePassed();
        } else {
            revert NotAuthorized();
        }

        address a = arbiter;
        if (a == e.client || a == e.freelancer) revert ConflictOfInterest();

        e.arbiter = a;
        e.status = Status.Disputed;
        e.disputedAt = uint64(block.timestamp);
        emit DisputeOpened(escrowId, msg.sender, reason, a);
    }

    /// @notice arbiter ตัดสิน: freelancerBps = สัดส่วนค่าจ้างที่ freelancer ได้ (0–10000)
    ///         ค่าธรรมเนียมคิดตามสัดส่วนเดียวกัน ส่วนที่เหลือทั้งหมดคืน client
    function resolveDispute(bytes32 escrowId, uint16 freelancerBps) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.status != Status.Disputed) revert InvalidStatus();
        if (msg.sender != e.arbiter) revert NotAuthorized();
        if (freelancerBps > BPS) revert InvalidShare();
        _resolve(escrowId, e, freelancerBps, false);
    }

    /// @notice arbiter เงียบเกิน arbiterTimeout → คู่กรณีฝ่ายใดก็ได้สั่งแบ่งครึ่งเพื่อไม่ให้เงินค้างตลอดไป
    function settleExpiredDispute(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client && msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Disputed) revert InvalidStatus();
        if (block.timestamp <= uint256(e.disputedAt) + arbiterTimeout) revert DisputeNotExpired();
        _resolve(escrowId, e, TIMEOUT_FREELANCER_BPS, true);
    }

    // ---------- Pull payment (fallback) ----------

    /// @notice เบิกเงินที่โอนให้ไม่สำเร็จตอนปิด escrow (เช่น ผู้รับเป็น contract ที่ปฏิเสธ ETH)
    function withdraw() external nonReentrant {
        uint256 value = pendingWithdrawals[msg.sender];
        if (value == 0) revert InvalidAmount();
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: value}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, value);
    }

    // ---------- Views ----------

    function computeEscrowId(address client, bytes32 projectId) public pure returns (bytes32) {
        return keccak256(abi.encode(client, projectId));
    }

    /// @notice คำนวณค่าธรรมเนียมและยอดรวมที่ต้องแนบ (ใช้สูตรเดียวกับ depositEscrow)
    function quote(uint256 amount) external view returns (uint256 fee, uint256 total) {
        fee = (amount * feeBps) / BPS;
        total = amount + fee;
    }

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    // ---------- Admin ----------

    /// @notice เปลี่ยนค่าธรรมเนียม — มีผลเฉพาะ escrow ที่ฝากหลังจากนี้ (escrow เดิมใช้ค่า snapshot)
    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeBpsUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    /// @notice เปลี่ยน arbiter — มีผลเฉพาะ dispute ที่เปิดหลังจากนี้
    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidAddress();
        emit ArbiterUpdated(arbiter, newArbiter);
        arbiter = newArbiter;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // ---------- Internal ----------

    function _releaseToFreelancer(bytes32 escrowId, Escrow storage e) private {
        (uint256 toFreelancer, , uint256 feePaid) = _settle(e, BPS, Status.Released);
        emit PaymentReleased(escrowId, e.freelancer, toFreelancer, feePaid);
    }

    function _resolve(bytes32 escrowId, Escrow storage e, uint16 freelancerBps, bool byTimeout) private {
        (uint256 toFreelancer, uint256 toClient, uint256 feePaid) = _settle(e, freelancerBps, Status.Resolved);
        emit DisputeResolved(escrowId, freelancerBps, toFreelancer, toClient, feePaid, byTimeout);
    }

    /// @dev แบ่งเงินทั้งหมดของ escrow ตามสัดส่วน freelancerBps ของค่าจ้าง
    ///      (ค่าธรรมเนียมแพลตฟอร์มคิดตามสัดส่วนเดียวกัน ส่วนที่เหลือเป็นของ client ไม่มีเศษหาย)
    ///      เปลี่ยนสถานะก่อนโอนเงิน (checks-effects-interactions)
    function _settle(
        Escrow storage e,
        uint16 freelancerBps,
        Status finalStatus
    ) private returns (uint256 toFreelancer, uint256 toClient, uint256 feePaid) {
        e.status = finalStatus;
        e.payoutBps = freelancerBps;

        toFreelancer = (e.amount * freelancerBps) / BPS;
        feePaid = (e.fee * freelancerBps) / BPS;
        toClient = e.amount + e.fee - toFreelancer - feePaid;

        if (toFreelancer > 0) _send(e.freelancer, toFreelancer);
        if (feePaid > 0) _send(feeRecipient, feePaid);
        if (toClient > 0) _send(e.client, toClient);
    }

    /// @dev ถ้าโอนไม่สำเร็จ (ผู้รับปฏิเสธ ETH) จะบันทึกเป็นยอดค้างให้มาเบิกเอง แทนที่จะ revert
    ///      เพื่อไม่ให้ผู้รับฝ่ายหนึ่งขวางเงินของอีกฝ่าย
    function _send(address to, uint256 value) private {
        (bool ok, ) = to.call{value: value}("");
        if (!ok) {
            pendingWithdrawals[to] += value;
            emit PayoutDeferred(to, value);
        }
    }
}
```

---

## 6. Test

ชุดเทสต์ 42 เคส ครอบคลุม:

- **ฝากเงิน:** flow ปกติ · ยอดไม่ตรง (`WrongPayment`) · owner ปรับค่าธรรมเนียมกลางทาง · พารามิเตอร์ผิด · arbiter เป็นคู่กรณี · คนอื่นจอง `projectId` ไม่ได้ · ฝากซ้ำ · ส่ง ETH ตรงๆ
- **ยอมรับงาน:** ผู้เรียก/`termsHash` ผิด · หลัง deadline · ยกเลิกก่อน accept (address freelancer ผิดไม่ทำให้เงินติด)
- **ส่งงานและช่วงตรวจรับ:** ส่งงานปลอมล็อกเงินไม่ได้ · client เงียบ → freelancer เบิกเอง · เปิด dispute หลังพ้นช่วงตรวจรับไม่ได้
- **คืนเงิน:** สิทธิ์ของแต่ละฝ่ายตามสถานะ
- **Dispute:** ตัดสิน 100% / 0% / 60-40 · timeout แบ่งครึ่ง · snapshot arbiter · ConflictOfInterest · freelancer ขวางสิทธิ์คืนเงินหลัง deadline ไม่ได้
- **ผู้รับเป็น contract:** ปฏิเสธ ETH → ยอดค้างและเบิกเองได้ · พยายาม re-enter → ถูกบล็อก
- **ความครบถ้วนของยอดเงิน:** 5 ยอด × 6 สัดส่วน (รวมยอดจิ๋วที่ปัดเศษ) ผลรวมครบทุก wei ไม่มี ETH ค้างใน contract

### `contracts/mocks/FreelancerMock.sol` (ใช้ในเทสต์เท่านั้น ไม่ต้อง deploy)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFreelinkEscrow {
    function acceptEscrow(bytes32 escrowId, bytes32 termsHash) external;
    function submitWork(bytes32 escrowId, bytes32 workHash) external;
    function withdraw() external;
}

/// @dev ใช้ในเทสต์เท่านั้น: จำลอง freelancer ที่เป็น contract (ปฏิเสธ ETH ได้ / พยายาม re-enter ได้)
contract FreelancerMock {
    IFreelinkEscrow public immutable escrow;
    bool public acceptEth;
    bool public attack;
    bool public reentryBlocked;

    constructor(address escrow_) {
        escrow = IFreelinkEscrow(escrow_);
    }

    function setAcceptEth(bool v) external { acceptEth = v; }
    function setAttack(bool v) external { attack = v; }

    function accept(bytes32 escrowId, bytes32 termsHash) external { escrow.acceptEscrow(escrowId, termsHash); }
    function submit(bytes32 escrowId, bytes32 workHash) external { escrow.submitWork(escrowId, workHash); }
    function pull() external { escrow.withdraw(); }

    receive() external payable {
        if (attack) {
            try escrow.withdraw() {} catch { reentryBlocked = true; }
        } else {
            require(acceptEth, "no eth");
        }
    }
}
```

### `test/FreelinkEscrow.test.js`

สิ่งที่เปลี่ยนจาก Hardhat 2 ในไฟล์เทสต์:

| เรื่อง | Hardhat 2 | Hardhat 3 |
| --- | --- | --- |
| Import | `require(...)` | `import ...` (ES module) |
| `ethers` | `require("hardhat").ethers` | ได้จาก `await network.create()` |
| `time` ฯลฯ | import จาก `@nomicfoundation/hardhat-network-helpers` | ได้จาก `networkHelpers` ของ connection เดียวกัน |
| ตรวจ revert ทั่วไป | `.to.be.reverted` | `.to.be.revert(ethers)` |
| ตรวจยอดเงิน | `changeEtherBalance(s)(accounts, ...)` | `changeEtherBalance(s)(ethers, accounts, ...)` |

`revertedWithCustomError`, `.emit(...).withArgs(...)`, `ethers.parseEther`, `ethers.id` ใช้เหมือนเดิม

```js
import { expect } from "chai";
import { network } from "hardhat";

// Hardhat 3: ไม่มี ethers/helpers แบบ global แล้ว ต้องสร้าง network connection เอง (ใช้ร่วมกันทั้งไฟล์)
const { ethers, networkHelpers } = await network.create();
const { time } = networkHelpers;

const DAY = 24 * 3600;
const FEE_BPS = 500; // 5%
const REVIEW = 7 * DAY; // ช่วงตรวจรับหลังส่งงาน
const ARBITER_TIMEOUT = 14 * DAY; // เวลาที่ arbiter มีเพื่อตัดสิน
const WAGE = ethers.parseEther("1"); // ค่าจ้าง 1 ETH
const FEE = ethers.parseEther("0.05"); // ค่าธรรมเนียม 5%
const TOTAL = WAGE + FEE; // client จ่ายรวม 1.05 ETH

// ลำดับตรงกับ enum Status ใน contract
const Status = {
  Unfunded: 0n,
  Funded: 1n,
  Active: 2n,
  Submitted: 3n,
  Disputed: 4n,
  Released: 5n,
  Refunded: 6n,
  Resolved: 7n,
};

async function setup() {
  const [owner, client, freelancer, arbiter, treasury, stranger] = await ethers.getSigners();
  const escrow = await ethers.deployContract("FreelinkEscrow", [
    arbiter.address,
    treasury.address,
    FEE_BPS,
    REVIEW,
    ARBITER_TIMEOUT,
  ]);
  const projectId = ethers.id("project-1");
  const termsHash = ethers.id("terms-v1");
  const deadline = (await time.latest()) + 7 * DAY;
  const escrowId = await escrow.computeEscrowId(client.address, projectId);
  return { escrow, owner, client, freelancer, arbiter, treasury, stranger, projectId, termsHash, deadline, escrowId };
}

async function funded() {
  const c = await setup();
  await c.escrow
    .connect(c.client)
    .depositEscrow(c.projectId, c.freelancer.address, c.deadline, c.termsHash, WAGE, { value: TOTAL });
  return c;
}

async function active() {
  const c = await funded();
  await c.escrow.connect(c.freelancer).acceptEscrow(c.escrowId, c.termsHash);
  return c;
}

async function submitted() {
  const c = await active();
  await c.escrow.connect(c.freelancer).submitWork(c.escrowId, ethers.id("https://example.com/work"));
  return c;
}

async function disputed() {
  const c = await active();
  await c.escrow.connect(c.client).openDispute(c.escrowId, "งานไม่ตรงตามตกลง");
  return c;
}

const statusOf = async (escrow, id) => (await escrow.getEscrow(id)).status;

describe("FreelinkEscrow v2 (native ETH)", () => {
  describe("ฝากเงิน (depositEscrow)", () => {
    it("ฝาก → ยอมรับ → ส่งงาน → ปล่อยเงิน (freelancer ได้ 1 ETH, แพลตฟอร์มได้ 0.05 ETH)", async () => {
      const { escrow, client, freelancer, treasury, projectId, termsHash, deadline, escrowId } = await setup();

      await expect(
        escrow.connect(client).depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL })
      )
        .to.emit(escrow, "EscrowFunded")
        .withArgs(escrowId, projectId, client.address, freelancer.address, WAGE, FEE, deadline, termsHash);

      expect(await statusOf(escrow, escrowId)).to.equal(Status.Funded);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(TOTAL);

      await expect(escrow.connect(freelancer).acceptEscrow(escrowId, termsHash))
        .to.emit(escrow, "EscrowAccepted")
        .withArgs(escrowId, freelancer.address);
      expect(await statusOf(escrow, escrowId)).to.equal(Status.Active);

      await expect(escrow.connect(freelancer).submitWork(escrowId, ethers.id("work"))).to.emit(escrow, "WorkSubmitted");
      expect(await statusOf(escrow, escrowId)).to.equal(Status.Submitted);

      const tx = escrow.connect(client).releasePayment(escrowId);
      await expect(tx).to.emit(escrow, "PaymentReleased").withArgs(escrowId, freelancer.address, WAGE, FEE);
      await expect(tx).to.changeEtherBalances(ethers, [freelancer, treasury], [WAGE, FEE]);

      const e = await escrow.getEscrow(escrowId);
      expect(e.status).to.equal(Status.Released);
      expect(e.payoutBps).to.equal(10000n);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    });

    it("computeEscrowId ตรงกับสูตร keccak256(abi.encode(client, projectId)) ฝั่ง JS", async () => {
      const { escrow, client, projectId, escrowId } = await setup();
      const expected = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["address", "bytes32"], [client.address, projectId])
      );
      expect(escrowId).to.equal(expected);
    });

    it("quote() ให้ค่าธรรมเนียมและยอดรวมตรงกับที่ต้องแนบ", async () => {
      const { escrow } = await setup();
      const [fee, total] = await escrow.quote(WAGE);
      expect(fee).to.equal(FEE);
      expect(total).to.equal(TOTAL);
    });

    it("แนบ ETH ไม่เท่ากับ amount + fee → revert WrongPayment (ไม่เดาแทน client)", async () => {
      const { escrow, client, freelancer, projectId, termsHash, deadline } = await setup();
      await expect(
        escrow.connect(client).depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: WAGE })
      )
        .to.be.revertedWithCustomError(escrow, "WrongPayment")
        .withArgs(TOTAL, WAGE);
      await expect(
        escrow
          .connect(client)
          .depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL + 1n })
      ).to.be.revertedWithCustomError(escrow, "WrongPayment");
    });

    it("owner ปรับ feeBps ระหว่างที่ client เตรียมธุรกรรม → ธุรกรรมเก่า revert แทนที่จะจ่ายผิดยอด", async () => {
      const { escrow, owner, client, freelancer, projectId, termsHash, deadline } = await setup();
      await escrow.connect(owner).setFeeBps(1000); // 10% → ยอดที่ถูกต้องเป็น 1.1 ETH
      await expect(
        escrow.connect(client).depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL })
      )
        .to.be.revertedWithCustomError(escrow, "WrongPayment")
        .withArgs(ethers.parseEther("1.1"), TOTAL);
    });

    it("พารามิเตอร์ไม่ถูกต้อง: amount 0 / terms ว่าง / freelancer ผิด / deadline ผิด", async () => {
      const { escrow, client, freelancer, projectId, termsHash, deadline } = await setup();
      const dep = (args, value = TOTAL) =>
        escrow.connect(client).depositEscrow(...args, { value });

      await expect(dep([projectId, freelancer.address, deadline, termsHash, 0n], 0n)).to.be.revertedWithCustomError(
        escrow,
        "InvalidAmount"
      );
      await expect(
        dep([projectId, freelancer.address, deadline, ethers.ZeroHash, WAGE])
      ).to.be.revertedWithCustomError(escrow, "InvalidTerms");
      await expect(dep([projectId, ethers.ZeroAddress, deadline, termsHash, WAGE])).to.be.revertedWithCustomError(
        escrow,
        "InvalidAddress"
      );
      await expect(dep([projectId, client.address, deadline, termsHash, WAGE])).to.be.revertedWithCustomError(
        escrow,
        "InvalidAddress"
      );
      const past = (await time.latest()) - 10;
      await expect(dep([projectId, freelancer.address, past, termsHash, WAGE])).to.be.revertedWithCustomError(
        escrow,
        "InvalidDeadline"
      );
      const tooFar = (await time.latest()) + 366 * DAY;
      await expect(dep([projectId, freelancer.address, tooFar, termsHash, WAGE])).to.be.revertedWithCustomError(
        escrow,
        "InvalidDeadline"
      );
    });

    it("arbiter เป็นคู่กรณีของ escrow เองไม่ได้ (ConflictOfInterest)", async () => {
      const { escrow, arbiter, client, freelancer, projectId, termsHash, deadline } = await setup();
      await expect(
        escrow.connect(arbiter).depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL })
      ).to.be.revertedWithCustomError(escrow, "ConflictOfInterest");
      await expect(
        escrow.connect(client).depositEscrow(projectId, arbiter.address, deadline, termsHash, WAGE, { value: TOTAL })
      ).to.be.revertedWithCustomError(escrow, "ConflictOfInterest");
    });

    it("คนอื่นจอง projectId เดียวกันไม่ได้ขวาง client ตัวจริง (escrowId ผูกกับผู้ฝาก)", async () => {
      const { escrow, client, stranger, freelancer, projectId, termsHash, deadline, escrowId } = await setup();
      const squatId = await escrow.computeEscrowId(stranger.address, projectId);
      await escrow
        .connect(stranger)
        .depositEscrow(projectId, freelancer.address, deadline, termsHash, 1n, { value: 1n });

      await escrow
        .connect(client)
        .depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL });

      expect(squatId).to.not.equal(escrowId);
      expect((await escrow.getEscrow(escrowId)).client).to.equal(client.address);
      expect((await escrow.getEscrow(squatId)).client).to.equal(stranger.address);
    });

    it("ฝากซ้ำ projectId เดิมของ client คนเดิมไม่ได้ แม้ escrow เดิมจบไปแล้ว", async () => {
      const { escrow, client, freelancer, projectId, termsHash, deadline, escrowId } = await funded();
      await expect(
        escrow.connect(client).depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL })
      ).to.be.revertedWithCustomError(escrow, "AlreadyExists");

      await escrow.connect(client).refundClient(escrowId);
      await expect(
        escrow.connect(client).depositEscrow(projectId, freelancer.address, deadline, termsHash, WAGE, { value: TOTAL })
      ).to.be.revertedWithCustomError(escrow, "AlreadyExists");
    });

    it("ส่ง ETH เข้า contract ตรงๆ (ไม่ผ่าน depositEscrow) ไม่ได้", async () => {
      const { escrow, client } = await setup();
      await expect(client.sendTransaction({ to: await escrow.getAddress(), value: 1n })).to.be.revert(ethers);
    });
  });

  describe("ยอมรับงาน (acceptEscrow)", () => {
    it("เฉพาะ freelancer ที่ระบุ, ต้องส่ง termsHash ตรง, ยอมรับได้ครั้งเดียว", async () => {
      const { escrow, client, stranger, freelancer, termsHash, escrowId } = await funded();
      await expect(escrow.connect(stranger).acceptEscrow(escrowId, termsHash)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await expect(escrow.connect(client).acceptEscrow(escrowId, termsHash)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await expect(
        escrow.connect(freelancer).acceptEscrow(escrowId, ethers.id("terms-v2-ที่ไม่ตรง"))
      ).to.be.revertedWithCustomError(escrow, "InvalidTerms");

      await escrow.connect(freelancer).acceptEscrow(escrowId, termsHash);
      await expect(escrow.connect(freelancer).acceptEscrow(escrowId, termsHash)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });

    it("ยอมรับหลัง deadline ไม่ได้ และ client ขอเงินคืนได้ตลอดตอนยังไม่ accept", async () => {
      const { escrow, client, freelancer, termsHash, deadline, escrowId } = await funded();
      await time.increaseTo(deadline + 1);
      await expect(escrow.connect(freelancer).acceptEscrow(escrowId, termsHash)).to.be.revertedWithCustomError(
        escrow,
        "DeadlinePassed"
      );
      await expect(escrow.connect(client).refundClient(escrowId)).to.changeEtherBalance(ethers, client, TOTAL);
    });

    it("ใส่ address freelancer ผิด → client ยกเลิกและได้เงินคืนเต็มทันที ไม่ต้องรอ deadline", async () => {
      const { escrow, client, escrowId } = await funded();
      await expect(escrow.connect(client).refundClient(escrowId)).to.changeEtherBalance(ethers, client, TOTAL);
      expect(await statusOf(escrow, escrowId)).to.equal(Status.Refunded);
    });

    it("freelancer ปฏิเสธรับงานได้ → client ได้เงินคืนเต็ม", async () => {
      const { escrow, client, freelancer, escrowId } = await funded();
      await expect(escrow.connect(freelancer).refundClient(escrowId)).to.changeEtherBalance(ethers, client, TOTAL);
    });

    it("ก่อน accept: client ปล่อยเงินไม่ได้, freelancer ส่งงานไม่ได้, เปิด dispute ไม่ได้", async () => {
      const { escrow, client, freelancer, escrowId } = await funded();
      await expect(escrow.connect(client).releasePayment(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
      await expect(escrow.connect(freelancer).submitWork(escrowId, ethers.id("w"))).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
      await expect(escrow.connect(client).openDispute(escrowId, "x")).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
      await expect(escrow.connect(freelancer).openDispute(escrowId, "x")).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });
  });

  describe("ส่งงานและช่วงตรวจรับ", () => {
    it("ส่งงานแล้วเริ่มนับช่วงตรวจรับ reviewEndsAt = เวลาส่ง + reviewPeriod", async () => {
      const { escrow, escrowId } = await submitted();
      const e = await escrow.getEscrow(escrowId);
      const block = await ethers.provider.getBlock("latest");
      expect(e.reviewEndsAt).to.equal(BigInt(block.timestamp + REVIEW));
    });

    it("ส่งงานได้เฉพาะ freelancer, ก่อน deadline เท่านั้น", async () => {
      const { escrow, client, freelancer, deadline, escrowId } = await active();
      await expect(escrow.connect(client).submitWork(escrowId, ethers.id("w"))).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await time.increaseTo(deadline + 1);
      await expect(escrow.connect(freelancer).submitWork(escrowId, ethers.id("w"))).to.be.revertedWithCustomError(
        escrow,
        "DeadlinePassed"
      );
    });

    it("ส่งงานแล้ว client ขอเงินคืนเองไม่ได้ แม้เลย deadline (ต้อง dispute) — ส่งงานปลอมก็ล็อกเงินถาวรไม่ได้", async () => {
      const { escrow, client, arbiter, deadline, escrowId } = await submitted();
      await time.increaseTo(deadline + 1);
      await expect(escrow.connect(client).refundClient(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );

      // client ปฏิเสธงาน (เปิด dispute) ภายในช่วงตรวจรับ แล้ว arbiter ตัดสินคืนเต็ม
      await escrow.connect(client).openDispute(escrowId, "ไฟล์ที่ส่งมาเป็นไฟล์เปล่า");
      await expect(escrow.connect(arbiter).resolveDispute(escrowId, 0)).to.changeEtherBalance(ethers, client, TOTAL);
    });

    it("client เงียบหลังส่งงาน: ก่อนพ้นช่วงตรวจรับ claim ไม่ได้ พ้นแล้ว freelancer เบิกเองได้", async () => {
      const { escrow, client, freelancer, treasury, stranger, escrowId } = await submitted();

      await expect(escrow.connect(freelancer).claimAfterReview(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "ReviewPeriodActive"
      );

      await time.increase(REVIEW + 1);
      await expect(escrow.connect(stranger).claimAfterReview(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await expect(escrow.connect(client).claimAfterReview(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );

      const tx = escrow.connect(freelancer).claimAfterReview(escrowId);
      await expect(tx).to.emit(escrow, "PaymentReleased").withArgs(escrowId, freelancer.address, WAGE, FEE);
      await expect(tx).to.changeEtherBalances(ethers, [freelancer, treasury], [WAGE, FEE]);
      expect(await statusOf(escrow, escrowId)).to.equal(Status.Released);
    });

    it("พ้นช่วงตรวจรับแล้ว client เปิด dispute ไม่ได้ (ReviewPeriodOver)", async () => {
      const { escrow, client, escrowId } = await submitted();
      await time.increase(REVIEW + 1);
      await expect(escrow.connect(client).openDispute(escrowId, "ช้าไปแล้ว")).to.be.revertedWithCustomError(
        escrow,
        "ReviewPeriodOver"
      );
    });

    it("client ปล่อยเงินได้ทั้งตอน Active (ส่งงานนอกระบบ) และตอน Submitted", async () => {
      const a = await active();
      await expect(a.escrow.connect(a.client).releasePayment(a.escrowId)).to.changeEtherBalances(
        ethers,
        [a.freelancer, a.treasury],
        [WAGE, FEE]
      );
      const s = await submitted();
      await expect(s.escrow.connect(s.client).releasePayment(s.escrowId)).to.changeEtherBalances(
        ethers,
        [s.freelancer, s.treasury],
        [WAGE, FEE]
      );
    });

    it("ปล่อยเงินซ้ำ / คนอื่นปล่อยเงินไม่ได้", async () => {
      const { escrow, client, freelancer, stranger, escrowId } = await active();
      await expect(escrow.connect(freelancer).releasePayment(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await expect(escrow.connect(stranger).releasePayment(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await escrow.connect(client).releasePayment(escrowId);
      await expect(escrow.connect(client).releasePayment(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });
  });

  describe("คืนเงิน (refundClient)", () => {
    it("client ขอคืนได้หลัง deadline ถ้ายังไม่ส่งงาน (ได้คืนเต็ม 1.05 ETH) ก่อนหน้านั้นไม่ได้", async () => {
      const { escrow, client, deadline, escrowId } = await active();
      await expect(escrow.connect(client).refundClient(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotYetRefundable"
      );
      await time.increaseTo(deadline + 1);
      const tx = escrow.connect(client).refundClient(escrowId);
      await expect(tx).to.emit(escrow, "EscrowRefunded").withArgs(escrowId, client.address, TOTAL);
      await expect(tx).to.changeEtherBalance(ethers, client, TOTAL);
      expect(await statusOf(escrow, escrowId)).to.equal(Status.Refunded);
    });

    it("freelancer ยกเลิกงานตอนไหนก็ได้ก่อนจบ → client ได้เงินคืนทันที", async () => {
      const a = await active();
      await expect(a.escrow.connect(a.freelancer).refundClient(a.escrowId)).to.changeEtherBalance(
        ethers,
        a.client,
        TOTAL
      );
      const s = await submitted();
      await expect(s.escrow.connect(s.freelancer).refundClient(s.escrowId)).to.changeEtherBalance(
        ethers,
        s.client,
        TOTAL
      );
    });

    it("คนอื่นขอคืนเงินไม่ได้ และคืนซ้ำไม่ได้", async () => {
      const { escrow, client, stranger, escrowId } = await funded();
      await expect(escrow.connect(stranger).refundClient(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await escrow.connect(client).refundClient(escrowId);
      await expect(escrow.connect(client).refundClient(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });
  });

  describe("ข้อพิพาท (dispute)", () => {
    it("เปิด dispute: บันทึก arbiter ณ ตอนนั้น, client ปล่อยเงินเองไม่ได้ระหว่างพิพาท", async () => {
      const { escrow, client, freelancer, arbiter, escrowId } = await active();
      await expect(escrow.connect(freelancer).openDispute(escrowId, "client ไม่ตอบกลับ"))
        .to.emit(escrow, "DisputeOpened")
        .withArgs(escrowId, freelancer.address, "client ไม่ตอบกลับ", arbiter.address);

      const e = await escrow.getEscrow(escrowId);
      expect(e.status).to.equal(Status.Disputed);
      expect(e.arbiter).to.equal(arbiter.address);

      await expect(escrow.connect(client).releasePayment(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
      await expect(escrow.connect(client).refundClient(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });

    it("freelancer เปิด dispute หลัง deadline ไม่ได้ จึงขวางสิทธิ์คืนเงินของ client ไม่ได้", async () => {
      const { escrow, client, freelancer, deadline, escrowId } = await active();
      await time.increaseTo(deadline + 1);
      await expect(escrow.connect(freelancer).openDispute(escrowId, "ขอเวลาเพิ่ม")).to.be.revertedWithCustomError(
        escrow,
        "DeadlinePassed"
      );
      await expect(escrow.connect(client).refundClient(escrowId)).to.changeEtherBalance(ethers, client, TOTAL);
    });

    it("ตอน Submitted มีแต่ client ที่เปิด dispute ได้ (freelancer ต้องรอ claimAfterReview)", async () => {
      const { escrow, freelancer, stranger, escrowId } = await submitted();
      await expect(escrow.connect(freelancer).openDispute(escrowId, "x")).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
      await expect(escrow.connect(stranger).openDispute(escrowId, "x")).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
    });

    it("arbiter ตัดสินให้ freelancer 100% (เท่ากับปล่อยเงิน)", async () => {
      const { escrow, freelancer, arbiter, treasury, escrowId } = await disputed();
      const tx = escrow.connect(arbiter).resolveDispute(escrowId, 10000);
      await expect(tx).to.emit(escrow, "DisputeResolved").withArgs(escrowId, 10000, WAGE, 0, FEE, false);
      await expect(tx).to.changeEtherBalances(ethers, [freelancer, treasury], [WAGE, FEE]);
      const e = await escrow.getEscrow(escrowId);
      expect(e.status).to.equal(Status.Resolved);
      expect(e.payoutBps).to.equal(10000n);
    });

    it("arbiter ตัดสินให้ client 100% (คืนเต็มรวมค่าธรรมเนียม แพลตฟอร์มไม่ได้อะไร)", async () => {
      const { escrow, client, arbiter, treasury, escrowId } = await disputed();
      const tx = escrow.connect(arbiter).resolveDispute(escrowId, 0);
      await expect(tx).to.changeEtherBalances(ethers, [client, treasury], [TOTAL, 0n]);
    });

    it("arbiter แบ่ง 60/40: ค่าธรรมเนียมคิดตามสัดส่วน ผลรวมครบทุก wei", async () => {
      const { escrow, client, freelancer, arbiter, treasury, escrowId } = await disputed();
      const tx = escrow.connect(arbiter).resolveDispute(escrowId, 6000);
      // freelancer 0.6, แพลตฟอร์ม 0.03, client 0.4 + ค่าธรรมเนียมส่วนที่เหลือ 0.02 = 0.42
      await expect(tx).to.changeEtherBalances(
        ethers,
        [freelancer, treasury, client],
        [ethers.parseEther("0.6"), ethers.parseEther("0.03"), ethers.parseEther("0.42")]
      );
      await expect(tx)
        .to.emit(escrow, "DisputeResolved")
        .withArgs(
          escrowId,
          6000,
          ethers.parseEther("0.6"),
          ethers.parseEther("0.42"),
          ethers.parseEther("0.03"),
          false
        );
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    });

    it("ตัดสินไม่ได้ถ้าไม่ใช่ arbiter / สัดส่วนเกิน 100% / ไม่ได้อยู่ในสถานะพิพาท", async () => {
      const { escrow, client, arbiter, escrowId } = await disputed();
      await expect(escrow.connect(client).resolveDispute(escrowId, 0)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await expect(escrow.connect(arbiter).resolveDispute(escrowId, 10001)).to.be.revertedWithCustomError(
        escrow,
        "InvalidShare"
      );
      await escrow.connect(arbiter).resolveDispute(escrowId, 5000);
      await expect(escrow.connect(arbiter).resolveDispute(escrowId, 5000)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });

    it("owner เปลี่ยน arbiter กลางคันไม่ได้ผลกับ dispute ที่เปิดไปแล้ว (ใช้ arbiter ตอนเปิด)", async () => {
      const { escrow, owner, arbiter, stranger, escrowId } = await disputed();
      await expect(escrow.connect(owner).setArbiter(stranger.address))
        .to.emit(escrow, "ArbiterUpdated")
        .withArgs(arbiter.address, stranger.address);

      await expect(escrow.connect(stranger).resolveDispute(escrowId, 0)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );
      await escrow.connect(arbiter).resolveDispute(escrowId, 0);
      expect(await statusOf(escrow, escrowId)).to.equal(Status.Resolved);
    });

    it("ถ้า arbiter ปัจจุบันเป็นคู่กรณี จะเปิด dispute ไม่ได้ (ConflictOfInterest)", async () => {
      const { escrow, owner, client, escrowId } = await active();
      await escrow.connect(owner).setArbiter(client.address);
      await expect(escrow.connect(client).openDispute(escrowId, "x")).to.be.revertedWithCustomError(
        escrow,
        "ConflictOfInterest"
      );
    });

    it("arbiter เงียบเกินกำหนด → คู่กรณีสั่งแบ่งครึ่งได้ (ก่อนหมดเวลาไม่ได้)", async () => {
      const { escrow, client, freelancer, arbiter, treasury, stranger, escrowId } = await disputed();

      await expect(escrow.connect(client).settleExpiredDispute(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "DisputeNotExpired"
      );

      await time.increase(ARBITER_TIMEOUT + 1);
      await expect(escrow.connect(stranger).settleExpiredDispute(escrowId)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );

      const tx = escrow.connect(freelancer).settleExpiredDispute(escrowId);
      // freelancer 0.5, แพลตฟอร์ม 0.025, client 0.5 + 0.025 = 0.525
      await expect(tx).to.changeEtherBalances(
        ethers,
        [freelancer, treasury, client],
        [ethers.parseEther("0.5"), ethers.parseEther("0.025"), ethers.parseEther("0.525")]
      );
      await expect(tx)
        .to.emit(escrow, "DisputeResolved")
        .withArgs(
          escrowId,
          5000,
          ethers.parseEther("0.5"),
          ethers.parseEther("0.525"),
          ethers.parseEther("0.025"),
          true
        );

      // ปิดแล้ว arbiter มาตัดสินซ้ำไม่ได้
      await expect(escrow.connect(arbiter).resolveDispute(escrowId, 0)).to.be.revertedWithCustomError(
        escrow,
        "InvalidStatus"
      );
    });
  });

  describe("ผู้รับเงินเป็น contract (pull-payment fallback)", () => {
    async function withMockFreelancer() {
      const c = await setup();
      const mock = await ethers.deployContract("FreelancerMock", [await c.escrow.getAddress()]);
      const mockAddr = await mock.getAddress();
      await c.escrow
        .connect(c.client)
        .depositEscrow(c.projectId, mockAddr, c.deadline, c.termsHash, WAGE, { value: TOTAL });
      await mock.accept(c.escrowId, c.termsHash);
      return { ...c, mock, mockAddr };
    }

    it("freelancer ปฏิเสธ ETH → ปล่อยเงินไม่ล้ม ยอดค้างไว้ให้เบิกเอง และค่าธรรมเนียมไม่ถูกขวาง", async () => {
      const { escrow, client, treasury, mock, mockAddr, escrowId } = await withMockFreelancer();

      const tx = escrow.connect(client).releasePayment(escrowId);
      await expect(tx).to.emit(escrow, "PayoutDeferred").withArgs(mockAddr, WAGE);
      await expect(tx).to.changeEtherBalance(ethers, treasury, FEE);
      expect(await escrow.pendingWithdrawals(mockAddr)).to.equal(WAGE);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(WAGE);

      await mock.setAcceptEth(true);
      await expect(mock.pull()).to.changeEtherBalance(ethers, mock, WAGE);
      expect(await escrow.pendingWithdrawals(mockAddr)).to.equal(0n);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);

      await expect(mock.pull()).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("ตัดสินแบ่งส่วนโดยฝั่ง freelancer ปฏิเสธ ETH → ส่วนของ client ยังได้ทันที", async () => {
      const { escrow, client, arbiter, treasury, mockAddr, escrowId } = await withMockFreelancer();
      await escrow.connect(client).openDispute(escrowId, "x");

      const tx = escrow.connect(arbiter).resolveDispute(escrowId, 5000);
      await expect(tx).to.changeEtherBalances(
        ethers,
        [client, treasury],
        [ethers.parseEther("0.525"), ethers.parseEther("0.025")]
      );
      expect(await escrow.pendingWithdrawals(mockAddr)).to.equal(ethers.parseEther("0.5"));
    });

    it("ผู้รับพยายาม re-enter ระหว่างรับเงิน → ถูกบล็อก ยอดไม่เพี้ยน", async () => {
      const { escrow, client, treasury, mock, escrowId } = await withMockFreelancer();
      await mock.setAttack(true);

      const tx = escrow.connect(client).releasePayment(escrowId);
      await expect(tx).to.changeEtherBalances(ethers, [mock, treasury], [WAGE, FEE]);
      expect(await mock.reentryBlocked()).to.equal(true);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    });
  });

  describe("แอดมิน", () => {
    it("เฉพาะ owner ตั้งค่าได้ และ feeBps เกิน 10% ไม่ได้", async () => {
      const { escrow, owner, stranger } = await setup();
      await expect(escrow.connect(stranger).setFeeBps(100)).to.be.revertedWithCustomError(
        escrow,
        "OwnableUnauthorizedAccount"
      );
      await expect(escrow.connect(owner).setFeeBps(1001)).to.be.revertedWithCustomError(escrow, "FeeTooHigh");
      await expect(escrow.connect(owner).setFeeBps(1000)).to.emit(escrow, "FeeBpsUpdated").withArgs(500, 1000);
    });

    it("เปลี่ยน feeBps ไม่กระทบ escrow ที่ฝากไปแล้ว (ใช้ค่า snapshot)", async () => {
      const { escrow, owner, client, freelancer, treasury, escrowId } = await active();
      await escrow.connect(owner).setFeeBps(1000);
      const tx = escrow.connect(client).releasePayment(escrowId);
      await expect(tx).to.changeEtherBalances(ethers, [freelancer, treasury], [WAGE, FEE]); // ยังใช้ 5% เดิม
    });

    it("ค่า constructor ผิดปกติถูกปฏิเสธ", async () => {
      const [, , , arbiter, treasury] = await ethers.getSigners();
      const deploy = (...args) => ethers.deployContract("FreelinkEscrow", args);
      await expect(deploy(ethers.ZeroAddress, treasury.address, 500, REVIEW, ARBITER_TIMEOUT)).to.be.revert(ethers);
      await expect(deploy(arbiter.address, treasury.address, 1001, REVIEW, ARBITER_TIMEOUT)).to.be.revert(ethers);
      await expect(deploy(arbiter.address, treasury.address, 500, 0, ARBITER_TIMEOUT)).to.be.revert(ethers);
      await expect(deploy(arbiter.address, treasury.address, 500, REVIEW, 91 * DAY)).to.be.revert(ethers);
    });
  });

  describe("ความครบถ้วนของยอดเงิน", () => {
    it("ทุกสัดส่วน/ทุกยอด (รวมยอดจิ๋วที่ปัดเศษ) แบ่งแล้วรวมเท่ายอดฝากพอดี ไม่มี wei ค้างใน contract", async () => {
      const { escrow, client, freelancer, arbiter } = await setup();
      const amounts = [1n, 7n, 999n, 12_345n, 123_456_789_123_456_789n];
      const shares = [0, 1, 3333, 5000, 9999, 10000];
      let n = 0;

      for (const amount of amounts) {
        for (const share of shares) {
          const projectId = ethers.id(`conservation-${n++}`);
          const termsHash = ethers.id("t");
          const deadline = (await time.latest()) + 7 * DAY;
          const id = await escrow.computeEscrowId(client.address, projectId);
          const [, total] = await escrow.quote(amount);

          await escrow
            .connect(client)
            .depositEscrow(projectId, freelancer.address, deadline, termsHash, amount, { value: total });
          await escrow.connect(freelancer).acceptEscrow(id, termsHash);
          await escrow.connect(client).openDispute(id, "t");

          const receipt = await (await escrow.connect(arbiter).resolveDispute(id, share)).wait();
          const ev = receipt.logs
            .map((l) => {
              try {
                return escrow.interface.parseLog(l);
              } catch {
                return null;
              }
            })
            .find((x) => x?.name === "DisputeResolved");

          expect(ev.args.toFreelancer + ev.args.toClient + ev.args.feePaid).to.equal(total);
          expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
        }
      }
    });
  });
});
```

รัน:

```bash
npx hardhat build      # compile contract
npx hardhat test
```

ผลที่ได้จริง: **42 passing** (Hardhat 3.21.1 + solc 0.8.24)

เพื่อยืนยันว่าเทสต์ไม่ได้ผ่านเพราะหละหลวม ผมลองแกะโค้ด contract ให้พังทีละจุดแล้วรันเทสต์ ทุกจุดถูกจับได้:

| ถ้าแก้ contract ให้ผิดอย่างนี้ | เทสต์ที่ fail |
| --- | --- |
| freelancer เปิด dispute หลัง deadline ได้ | 1 เคส |
| client ขอคืนเงินเองตอน `Submitted` ได้ | 1 เคส |
| คิดส่วนของ client ผิด (เศษหาย/เกิน) | 12 เคส |
| ไม่ snapshot arbiter ตอนเปิด dispute | 9 เคส |

> ข้อจำกัด: เทสต์พิสูจน์ได้เฉพาะสิ่งที่เขียนไว้ และยังไม่มี fuzz test / invariant test เต็มรูปแบบ ก่อนขึ้น mainnet ควรเพิ่มและให้ผู้เชี่ยวชาญ audit

---

## 7. Deploy

### `scripts/deploy.js`

```js
import "dotenv/config"; // Hardhat 3 ไม่โหลด .env ให้เอง (ใช้อ่าน ARBITER_ADDRESS ฯลฯ)
import { network } from "hardhat";

// เชื่อมกับเครือข่ายที่ระบุด้วย --network (ถ้าไม่ระบุจะใช้เครือข่ายจำลองในเครื่อง)
const { ethers, networkName } = await network.create();

const [deployer] = await ethers.getSigners();
console.log("Network :", networkName);
console.log("Deployer:", deployer.address);

// ถ้าไม่กำหนดใน .env จะใช้ address ของ deployer เองเป็น arbiter / ผู้รับค่าธรรมเนียม (เหมาะกับ demo เท่านั้น)
const arbiter = process.env.ARBITER_ADDRESS || deployer.address;
const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;
const feeBps = Number(process.env.FEE_BPS || 500); // 500 = 5%
const reviewPeriod = Number(process.env.REVIEW_PERIOD_SECONDS || 7 * 24 * 3600); // client มีเวลาตรวจรับ 7 วัน
const arbiterTimeout = Number(process.env.ARBITER_TIMEOUT_SECONDS || 14 * 24 * 3600); // arbiter มีเวลา 14 วัน

const escrow = await ethers.deployContract("FreelinkEscrow", [
  arbiter,
  feeRecipient,
  feeBps,
  reviewPeriod,
  arbiterTimeout,
]);
await escrow.waitForDeployment();

const address = await escrow.getAddress();
const chainId = (await ethers.provider.getNetwork()).chainId.toString();

console.log("FreelinkEscrow:", address);
console.log("Chain ID      :", chainId);
console.log("\nนำค่าไปใส่ใน .env ของ Frontend:");
console.log(`VITE_CHAIN_ID=${chainId}`);
console.log(`VITE_CONTRACT_ADDRESS=${address}`);
console.log("\nค่า constructor (ใช้กับคำสั่ง verify):");
console.log(arbiter, feeRecipient, feeBps, reviewPeriod, arbiterTimeout);
```

```bash
npx hardhat run scripts/deploy.js --network sepolia
# (ไม่ใส่ --network จะรันบนเครือข่ายจำลองในเครื่อง ไว้ลองก่อนได้ — ผมรันแบบนี้แล้วสำเร็จ)
```

ต้องมี Sepolia ETH ใน wallet ที่ deploy สำหรับจ่าย gas (ขอจาก faucet)

> `reviewPeriod` และ `arbiterTimeout` เป็นค่าที่ **แก้ไม่ได้หลัง deploy** (`immutable`) ถ้าอยากเปลี่ยนต้อง deploy ใหม่ ซึ่ง escrow เดิมจะอยู่กับ contract เก่า ดังนั้นตกลงค่ากับทีมก่อน (หัวข้อ 10)

> บทเรียนทางการของ Hardhat 3 ใช้ **Hardhat Ignition** สำหรับ deploy ในเอกสารนี้ใช้สคริปต์ธรรมดาเพราะเข้าใจง่ายกว่าสำหรับมือใหม่ และใช้งานได้เช่นกัน

ถ้าต้องการ verify source บน Etherscan (ให้คนอ่านโค้ดบน explorer ได้) ต้องตั้ง `ETHERSCAN_API_KEY` ใน keystore ไว้แล้ว (ดูหัวข้อ 3) จากนั้นส่งค่า constructor ต่อท้ายตรงๆ (ขั้นตอน verify ผมยังไม่ได้ลองกับ Etherscan จริง):

```bash
npx hardhat verify --network sepolia <ESCROW_ADDRESS> <ARBITER> <FEE_RECIPIENT> <FEE_BPS> <REVIEW_PERIOD_SECONDS> <ARBITER_TIMEOUT_SECONDS>
```

Etherscan V2 ใช้ API key เดียวกับทุกเครือข่าย

### ทางลัด: ใช้ Remix IDE

1. เปิด https://remix.ethereum.org สร้างไฟล์ `FreelinkEscrow.sol` แล้ววางโค้ดจากหัวข้อ 5 (Remix ดึง `@openzeppelin/contracts` ให้เองตาม import)
2. แท็บ **Solidity Compiler** → เลือก `0.8.24` → Compile
3. แท็บ **Deploy & Run** → Environment: **Injected Provider – MetaMask** (สลับ MetaMask เป็น Sepolia ก่อน)
4. กรอก constructor 5 ช่อง: `arbiter_`, `feeRecipient_`, `feeBps_`, `reviewPeriod_`, `arbiterTimeout_` (เช่น address ของคุณเอง, address ของคุณเอง, `500`, `604800`, `1209600`) แล้วกด Deploy
5. คัดลอก ABI จากแท็บ Compiler (ปุ่ม ABI) และ address จากรายการ Deployed Contracts

---

## 8. ส่งมอบให้ Frontend

### 8.1 ABI

หลังรัน `npx hardhat build`: ไฟล์ `artifacts/contracts/FreelinkEscrow.sol/FreelinkEscrow.json` → ใช้ field `abi` (ผมตรวจแล้วว่าพาธนี้ถูกต้อง และมี field `abi` อยู่)

### 8.2 ค่าที่ต้องกรอก

`.env` ของ Frontend:

```env
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0x...        # address ที่ได้จากการ deploy
VITE_EXPLORER_URL=https://sepolia.etherscan.io
```

`src/config/contractConfig.js`:

```js
chainName: "Sepolia",
abi: [ /* วาง ABI ที่นี่ */ ],
currency: { type: "native", symbol: "ETH", address: null, decimals: 18 },
methods: {
  depositEscrow: "depositEscrow",
  acceptEscrow: "acceptEscrow",
  submitWork: "submitWork",
  releasePayment: "releasePayment",
  claimAfterReview: "claimAfterReview",
  refundClient: "refundClient",
  openDispute: "openDispute",
  getEscrow: "getEscrow",
  quote: "quote",
  computeEscrowId: "computeEscrowId",
},
```

### 8.3 สิ่งที่ Frontend ต้องแก้เพิ่ม (จากการอ่านโค้ดใน zip)

| # | จุดที่ต้องแก้ | ตอนนี้ | ต้องเป็น |
| --- | --- | --- | --- |
| 1 | `contractService.depositEscrow` | `contract[method](projectId, { value })` | `contract[method](projectIdBytes32, freelancerAddress, deadline, termsHash, amountWei, { value: total })` โดย `total` ได้จาก `quote(amountWei)` |
| 2 | ฟังก์ชันอื่นทั้งหมด (`readEscrow`, `releasePayment`, `refundClient`, `openDispute`, ...) | ส่ง `projectId` เป็น string | ส่ง **`escrowId`** (จาก `computeEscrowId(clientAddress, id(projectId))` หรือเก็บจาก event `EscrowFunded`) |
| 3 | **wallet address ของ freelancer และของ client** | ไม่พบ field ที่เก็บใน mock data/โค้ด | Backend/โปรไฟล์ต้องเก็บ ใช้ตอนฝาก (freelancer) และตอนคำนวณ `escrowId` ฝั่ง freelancer (client) |
| 4 | **deadline** | ไม่มี | unix วินาที เช่น `Math.floor(Date.now()/1000) + วัน*86400` (ไม่เกิน 365 วัน) |
| 5 | **`termsHash`** | ไม่มี | hash ของข้อตกลงที่แสดงให้ทั้งสองฝ่ายเห็น (ดูหัวข้อ 4.5 และ 10) |
| 6 | **หน่วยเงิน** | UI คิดเป็น **บาท (THB)** แล้วส่ง `total` ไปเป็นตัวเลข | แปลง THB → ETH ก่อน (หัวข้อ 10) แล้ว `parseEther` เป็น `amountWei` |
| 7 | ค่าธรรมเนียม | `PLATFORM_FEE_RATE = 0.05` ฮาร์ดโค้ดใน `EscrowPayment.jsx` | เรียก `quote(amountWei)` ให้ contract คำนวณ `fee`/`total` |
| 8 | **หน้า/ปุ่มใหม่ฝั่ง freelancer** | ไม่มี | ปุ่ม "ยอมรับงาน" (`acceptEscrow` แสดง amount/deadline จาก `getEscrow` ให้เห็นก่อนกด) และ "เบิกเงิน" (`claimAfterReview` เมื่อพ้นช่วงตรวจรับ) |
| 9 | **หน้าตรวจรับฝั่ง client** | ไม่มี | แสดงนับถอยหลังถึง `reviewEndsAt` ปุ่ม "ปล่อยเงิน" (`releasePayment`) และ "ปฏิเสธงาน" (`openDispute` พร้อมเหตุผล) |
| 10 | สถานะ `Resolved` และเลข enum ใหม่ | — | ดูตารางหัวข้อ 4.2 |

ตัวอย่างโค้ดที่แก้แล้วสำหรับข้อ 1, 2, 6, 7 (แนวทาง ยังไม่ได้ทดสอบกับ Frontend จริง):

```js
import { id as hashId, parseEther } from "ethers";

export async function depositEscrow({ projectId, freelancerAddress, amountEth, deadline, termsHash }) {
  requireConfigured();
  const contract = await getSignerContract();
  const amountWei = parseEther(amountEth.toFixed(6)); // amountEth = ค่าจ้าง (ไม่รวมค่าธรรมเนียม)
  const [, total] = await contract.quote(amountWei);   // contract คำนวณยอดที่ต้องแนบให้
  return contract.depositEscrow(hashId(projectId), freelancerAddress, deadline, termsHash, amountWei, { value: total });
}

export async function releasePayment({ clientAddress, projectId }) {
  const contract = await getSignerContract();
  const escrowId = await contract.computeEscrowId(clientAddress, hashId(projectId));
  return contract.releasePayment(escrowId);
}
```

หมายเหตุ: ในโค้ดที่อ่านมา หน้าที่ใช้ contract จริงตอนนี้มีแค่ `depositEscrow` และ `releasePayment` ใน `EscrowPayment.jsx` ส่วนฟังก์ชันอื่นยังไม่มีปุ่ม/หน้าเรียกใช้

### 8.4 Error case ที่ UI ต้องรองรับ (จาก INTEGRATION.md หัวข้อ 8)

| กรณี | เกิดที่ไหน | วิธีตรวจ |
| --- | --- | --- |
| User rejected request | Wallet | ethers error `ACTION_REJECTED` / MetaMask code `4001` |
| Wrong network | Frontend | เทียบ `chainId` ของ wallet กับ `VITE_CHAIN_ID` ก่อนส่ง tx (`switchNetwork()` มีอยู่แล้ว) |
| Insufficient funds | Wallet/RPC | error `INSUFFICIENT_FUNDS` (ETH ไม่พอจ่ายทั้งค่าจ้างและ gas) |
| Contract execution reverted | Contract | ถอดรหัส custom error ด้วย ABI แล้วแสดงข้อความภาษาไทย ตามตารางด้านล่าง |

Custom error ของ contract:

| Error | ความหมาย / ข้อความที่ควรแสดง |
| --- | --- |
| `WrongPayment(expected, sent)` | ยอดที่แนบไม่ตรง (ค่าธรรมเนียมอาจเพิ่งเปลี่ยน) → ดึง `quote` ใหม่แล้วลองอีกครั้ง |
| `AlreadyExists` | โปรเจกต์นี้เคยฝากเงินแล้ว |
| `NotAuthorized` | คุณไม่มีสิทธิ์ทำรายการนี้ |
| `InvalidStatus` | สถานะปัจจุบันยังทำรายการนี้ไม่ได้ |
| `InvalidTerms` | ข้อตกลงไม่ตรงกับที่ client ระบุ (ตอน accept) หรือยังไม่ได้ระบุ (ตอนฝาก) |
| `DeadlinePassed` | เลยกำหนดเวลาแล้ว |
| `NotYetRefundable` | ยังขอเงินคืนไม่ได้ (ยังไม่ถึง deadline) |
| `ReviewPeriodActive` | ยังอยู่ในช่วงตรวจรับ เบิกเงินไม่ได้ |
| `ReviewPeriodOver` | พ้นช่วงตรวจรับแล้ว เปิดข้อพิพาทไม่ได้ |
| `DisputeNotExpired` | arbiter ยังมีเวลาตัดสิน |
| `ConflictOfInterest` | ผู้ตัดสินเป็นคู่กรณีของรายการนี้ (แจ้งผู้ดูแลระบบ) |
| `InvalidAmount` / `InvalidAddress` / `InvalidDeadline` / `InvalidShare` / `InvalidDuration` | ข้อมูลที่ส่งมาไม่ถูกต้อง |
| `FeeTooHigh` | ค่าธรรมเนียมเกิน 10% (ฝั่งผู้ดูแลระบบ) |
| `TransferFailed` | เบิกยอดค้างไม่สำเร็จ (ปลายทางปฏิเสธรับ ETH) |

---

## 9. (ถ้าจำเป็น) ฟัง Event ฝั่ง Backend

Backend/DB อาจต้องรู้ว่า on-chain เกิดอะไรขึ้นเพื่อสร้าง Notification และอัปเดตสถานะ ตัวอย่างพื้นฐานด้วย ethers v6 (ทีม Backend เป็นผู้ implement จริง):

```js
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const escrow = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

// ผูก escrow กับงานใน DB ตอนฝากเงิน — "ตรวจก่อนเชื่อ" เพราะใครก็ฝากด้วย projectId เดียวกันได้
escrow.on("EscrowFunded", (escrowId, projectId, client, freelancer, amount, fee, deadline, termsHash, event) => {
  // 1) หา project จาก projectId (เก็บ mapping id(project.id) → project.id ใน DB)
  // 2) ตรวจว่า client, freelancer, termsHash ตรงกับงานใน DB (ถ้าไม่ตรงให้ข้าม ไม่ผูก)
  // 3) บันทึก escrowId ไว้กับโปรเจกต์
});

escrow.on("PaymentReleased", (escrowId, freelancer, amountToFreelancer, fee, event) => {
  // 1) หา project จาก escrowId ที่บันทึกไว้
  // 2) อัปเดต status = completed, escrowStatus = released
  // 3) บันทึก txHash = event.log.transactionHash
});
```

ข้อควรระวัง: ควรรอ confirmation หลายบล็อกก่อนถือว่าสำเร็จ และเก็บ block number ล่าสุดที่ประมวลผล เพื่อดึง event ที่พลาดไปตอนเซิร์ฟเวอร์ล่ม

---

## 10. สิ่งที่ต้องตกลงกับทีมก่อน deploy จริง

ข้อที่ติ๊กแล้วคือตกลงหรือแก้แล้ว ข้อที่เหลือรอคุยต่อ

- [x] สกุลเงิน: **native ETH บน Sepolia** (ไม่ใช้เงินจริง)
- [x] ถ้า client หายไปหลังส่งงาน: แก้แล้ว เงินไปหา freelancer อัตโนมัติ (ผ่าน `claimAfterReview`) หลังพ้นช่วงตรวจรับ
- [ ] **ความยาว `reviewPeriod`** (ตอนนี้ค่าเริ่มต้น 7 วัน แก้ไม่ได้หลัง deploy) พร้อมออกแบบการแจ้งเตือน client ก่อนหมดเวลา
- [ ] **ความยาว `arbiterTimeout`** (ค่าเริ่มต้น 14 วัน) และยืนยันว่ารับผล **แบ่งครึ่ง** เมื่อ arbiter เงียบได้
- [ ] **สูตร `termsHash`**: hash อะไรบ้าง (เช่น ชื่องาน + ขอบเขต + ราคา + deadline) และเก็บข้อความต้นฉบับไว้ที่ไหนเพื่อให้ arbiter เปิดดูได้
- [ ] **วิธีแปลงบาท → ETH**: ตัวเลือกง่ายสุดสำหรับ demo คือตั้ง "อัตราคงที่" ในไฟล์ config (เช่น 1 ETH = X บาท) ส่วนการดึงราคาจริงต้องใช้ price oracle ซึ่งซับซ้อนกว่า
- [ ] ใครเป็น arbiter (wallet เดียว หรือ multisig) ขั้นตอนตัดสิน dispute และ **ต้องตัดสินภายในกี่วัน**
- [ ] ค่าธรรมเนียม: ตอนนี้ **5% บวกเพิ่ม** (ตรงกับ UI) ยืนยันหรือเปลี่ยน และ address ผู้รับ
- [ ] นโยบายเมื่อ **ส่งงานช้ากว่า deadline**: ตอนนี้ส่งผ่าน contract ไม่ได้ (client ปล่อยเงินเองได้) ตกลงว่าพอหรือต้องเพิ่มฟังก์ชันขยายเวลา
- [ ] ระบบมีงานหลาย milestone หรือขั้น "ขอแก้งาน" หรือไม่ (ตอนนี้จ่ายก้อนเดียว ส่งงานได้ครั้งเดียว แต่ `Project` ใน UI มี `milestones: []`)
- [ ] Wallet address ของ **freelancer และ client** จะเก็บที่ไหนและให้ใครกรอก (ต้องใช้คำนวณ `escrowId`)
- [ ] Backend ต้องตรวจ `EscrowFunded` ว่า client/freelancer/`termsHash` ตรงกับงานใน DB ก่อนผูก `escrowId` (หัวข้อ 4.6 ข้อ 2)
- [ ] RPC URL สาธารณะที่ใช้ demo
- [ ] วิธีเก็บ mapping `projectId` (string) ↔ `bytes32`

---

## 11. หมายเหตุด้านความปลอดภัย

- Contract นี้ยังไม่ผ่าน audit ใช้ได้เฉพาะ testnet/demo
- Arbiter มีอำนาจตัดสินเงินในข้อพิพาท จึงควรเป็น multisig ถ้าขึ้น production และต้องมีกระบวนการตัดสินที่ตอบสนองได้ทันเวลา (ไม่เช่นนั้นผลจะเป็นการแบ่งครึ่งตามกติกา timeout)
- การโอน ETH ใช้ `call` พร้อมกลไกยอดค้าง (`pendingWithdrawals`): ผู้รับที่ปฏิเสธ ETH ไม่ขวางผู้อื่นแล้ว แต่ผู้รับที่เป็น contract อาจใช้ gas ที่ได้รับหมดเพื่อกวน ผู้เรียกจะเสีย gas เพิ่ม (การจำกัด gas ที่ส่งต่อเป็นทางเลือกที่ต้องชั่งกับกระเป๋าแบบ contract wallet) ควรประเมินก่อนขึ้น production
- `reason` ของ dispute อยู่ใน event บน chain ถาวร อ่านได้ทุกคน ห้ามใส่ข้อมูลส่วนตัวหรือความลับ ให้ UI เตือนผู้ใช้
- owner เปลี่ยน `feeBps`, `arbiter`, `feeRecipient` ได้ทันที (มี event แจ้งแล้ว) ควรเฝ้าดู event เหล่านี้ และก่อน production ควรใช้ `Ownable2Step` กันโอนสิทธิ์ผิด address และให้ owner เป็น multisig
- Contract ไม่รู้ราคาบาท/ดอลลาร์ ค่าจ้างเป็น ETH ล้วน ราคา ETH ที่ผันผวนมีผลต่อมูลค่าจริงของค่าจ้าง (บน testnet ไม่เป็นปัญหา)
- Backend/Frontend ต้องไม่เชื่อ `amount`, `role` ที่ส่งมาจาก client โดยไม่ตรวจซ้ำ ใช้ค่าจาก chain/DB เป็นหลัก
- ห้าม commit `.env` หรือ private key และใช้ wallet แยกสำหรับ deploy
- ก่อนขึ้น mainnet: เพิ่ม fuzz/invariant test, ใช้ Slither หรือ Foundry fuzz, และให้ผู้เชี่ยวชาญ audit
- ประเด็นกฎหมายและภาษี (ข้อตกลงการใช้งานที่ระบุอำนาจของ arbiter, กฎหมายสินทรัพย์ดิจิทัล) อยู่นอกขอบเขตของโค้ดนี้ ควรปรึกษาผู้เชี่ยวชาญก่อนใช้กับเงินจริง
