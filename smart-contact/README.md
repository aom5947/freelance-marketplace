# Freelink Escrow v2 — Smart Contract (native ETH)

Escrow สำหรับค่าจ้างงาน Freelance บน Ethereum ใช้ native ETH (ทดลองบน Sepolia) สร้างด้วย Hardhat 3 + viem + OpenZeppelin v5
ออกแบบตาม [`docs/BACKEND_START_ver_0_2.md`](docs/BACKEND_START_ver_0_2.md) (เอกสารฉบับล่าสุด) ส่วน `BACKEND_START_ver.md` เป็นร่างเก่า (ERC-20) ไม่ใช้แล้ว

> **ส่วนที่เพิ่มเกินเอกสาร 0.2:** ขั้นตอนขอแก้งาน `requestRevision` (ตัดสินใจร่วมกันเมื่อ 31 ต.ค. 2026) ทำให้ constructor มี 7 ค่า (เพิ่ม `revisionPeriod`, `maxRevisions`) และ `getEscrow` มีฟิลด์ `revisionCount` เอกสาร 0.2 ยังไม่ได้ปรับตาม

> ⚠️ ยังไม่ผ่าน audit ใช้ได้เฉพาะ testnet/demo ห้ามใช้กับเงินจริง

## โครงสร้าง

```
contracts/FreelinkEscrow.sol      contract หลัก
contracts/mocks/FreelancerMock.sol  จำลอง freelancer ที่เป็น contract (ใช้ในเทสต์เท่านั้น)
test/FreelinkEscrow.ts            เทสต์ 55 เคส (node:test + viem)
scripts/deploy.ts                 deploy (อ่านค่าจาก env)
scripts/export-abi.ts             ส่งออก ABI → abi/FreelinkEscrow.abi.json
scripts/smoke-sepolia.ts          smoke test เดินกระบวนการจริงกับ contract ที่ deploy แล้ว
docs/                             เอกสารออกแบบ
```

`Counter.*`, `ignition/modules/Counter.ts` และ `scripts/send-op-tx.ts` เป็นตัวอย่างจาก template ของ Hardhat ไม่เกี่ยวกับระบบ

## คำสั่ง

```shell
npm install
npm run build        # compile
npm test             # เทสต์ทั้งหมด
npm run typecheck    # compile แล้ว tsc --noEmit
npm run export-abi   # สร้าง abi/FreelinkEscrow.abi.json
```

ต้องใช้ Node.js ≥ 22.10

## Deploy

### เครือข่ายจำลองในเครื่อง (ลองก่อน)

```shell
npm run deploy:local
```

### Sepolia

1. เก็บค่าลับใน keystore ของ Hardhat (ไม่ต้องเขียนลงไฟล์) ใช้ wallet ใหม่สำหรับ testnet เท่านั้น:

   ```shell
   npx hardhat keystore set SEPOLIA_RPC_URL
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   npx hardhat keystore set ETHERSCAN_API_KEY   # เฉพาะถ้าจะ verify
   ```

2. ต้องมี Sepolia ETH สำหรับ gas (ขอจาก faucet)
3. คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า policy (ไม่ลับ) — ถ้าไม่กรอก arbiter และ feeRecipient จะเป็น deployer
4. Deploy:

   ```shell
   npm run deploy:sepolia
   ```

สคริปต์จะพิมพ์ `VITE_CHAIN_ID` และ `VITE_CONTRACT_ADDRESS` ให้นำไปใส่ใน `.env` ของ Frontend

> `reviewPeriod`, `arbiterTimeout`, `revisionPeriod` และ `maxRevisions` เป็น `immutable` แก้ไม่ได้หลัง deploy ตกลงค่ากับทีมก่อน (ดูหัวข้อ 10 ในเอกสาร)

### Smoke test บน Sepolia

เดินกระบวนการจริง 3 เส้นทาง (ปล่อยเงิน / ขอแก้งาน / ข้อพิพาท) ด้วย ETH ยอดจิ๋ว กับ contract ที่ deploy แล้ว:

```shell
npm run smoke:local                              # ซ้อมในเครื่องก่อน (deploy contract ใหม่ให้เอง)
ESCROW_ADDRESS=0x... npm run smoke:sepolia       # PowerShell: $env:ESCROW_ADDRESS="0x..."; npm run smoke:sepolia
```

- สคริปต์สร้างกระเป๋า client/freelancer ชั่วคราว โอน ETH จาก deployer ไปให้ แล้วโอนที่เหลือกลับตอนจบ (deployer ต้องมี ETH ราว 0.011)
- เส้นทางข้อพิพาทต้องให้ deployer เป็น arbiter ถ้าไม่ใช่จะถูกข้าม
- ไม่ครอบคลุมเส้นทางที่ต้องรอเวลา (reviewPeriod / arbiterTimeout / deadline) ส่วนนั้นพึ่ง `npm test`
- RPC สาธารณะอาจตอบค่าล้าหลังหรือ error ชั่วคราว สคริปต์อ่านค่า ณ block ของธุรกรรมและส่งซ้ำให้เอง

Verify บน Etherscan (ยังไม่ได้ลองกับ Etherscan จริง):

```shell
npx hardhat verify --network sepolia <ADDRESS> <ARBITER> <FEE_RECIPIENT> <FEE_BPS> <REVIEW_PERIOD_SECONDS> <ARBITER_TIMEOUT_SECONDS> <REVISION_PERIOD_SECONDS> <MAX_REVISIONS>
```

## ส่งมอบให้ Frontend / Backend

- ABI: `npm run export-abi` → `abi/FreelinkEscrow.abi.json`
- ค่าที่ต้องส่ง: address ของ contract และ Chain ID (Sepolia = `11155111`)
- `projectId` = `keccak256(utf8(project.id))` (ethers: `id(project.id)`, viem: `keccak256(stringToHex(id))`)
- หลังฝากเงิน ทุกฟังก์ชันใช้ `escrowId = computeEscrowId(clientAddress, projectId)` ไม่ใช่ `projectId`
- ก่อนฝากเรียก `quote(amount)` เพื่อได้ยอดรวมที่ต้องแนบ (ค่าจ้าง + ค่าธรรมเนียม) แนบไม่ตรงเป๊ะ transaction ล้ม
- **เลข enum `Status` เปลี่ยนจากร่างเก่า** — ดูตารางในเอกสารหัวข้อ 4.2 และสิ่งที่ Frontend ต้องแก้ในหัวข้อ 8.3

## กติกาของ contract (สรุป)

ลำดับสถานะ: `Funded → Active → Submitted → Released | Refunded | Disputed → Resolved`

ขอแก้งาน: `Submitted → Active` (ผ่าน `requestRevision`) แล้ว freelancer `submitWork` ใหม่ → `Submitted` วนได้ไม่เกิน `maxRevisions` ครั้งต่อ escrow (ค่าเริ่มต้น 2 = ส่งงานได้สูงสุด 3 รอบ)

| ฟังก์ชัน | ผู้เรียก | เงื่อนไขหลัก |
| --- | --- | --- |
| `depositEscrow` (payable) | client | แนบ `amount + fee` พอดี · deadline ในอนาคตไม่เกิน 1 ปี · `termsHash` ไม่ว่าง |
| `acceptEscrow` | freelancer | `Funded` · `termsHash` ตรงกับที่ client ผูกไว้ |
| `submitWork` | freelancer | `Active` · ก่อน deadline · เริ่มนับช่วงตรวจรับ |
| `releasePayment` | client | `Active` / `Submitted` |
| `requestRevision(escrowId, reason)` | client | `Submitted` และอยู่ในช่วงตรวจรับ → กลับ `Active` · deadline ถูกขยายเป็นอย่างน้อย `now + revisionPeriod` (client ตั้งเองไม่ได้) · ขอได้ไม่เกิน `maxRevisions` ครั้งต่อ escrow (ไม่รีเซ็ตเมื่อส่งซ้ำ) |
| `claimAfterReview` | freelancer | `Submitted` และพ้นช่วงตรวจรับ (client เงียบ) |
| `refundClient` | client / freelancer | ก่อน accept ทั้งคู่ทำได้ · freelancer ทำได้ก่อนจบงาน · client ทำได้หลัง deadline ตอน `Active` **และไม่เคยส่งงาน** (เคยส่ง/อยู่ระหว่างแก้งานแล้วต้อง `openDispute`) · คืนเต็มรวมค่าธรรมเนียม |
| `openDispute(escrowId, reason)` | client / freelancer | client: `Active` หรือ `Submitted` ในช่วงตรวจรับ · freelancer: `Active` ก่อน deadline |
| `resolveDispute(escrowId, freelancerBps)` | arbiter (snapshot ตอนเปิด) | แบ่งสัดส่วน 0–10000 |
| `settleExpiredDispute` | client / freelancer | พ้น `arbiterTimeout` → แบ่งครึ่ง |
| `withdraw` | ผู้มียอดค้าง | เบิกเงินที่โอนไม่สำเร็จ (ผู้รับเป็น contract ที่ปฏิเสธ ETH) |
| `setFeeBps` / `setArbiter` / `setFeeRecipient` | owner | `feeBps` ≤ 1000 (10%) · มีผลกับ escrow/dispute ใหม่เท่านั้น |

ค่าธรรมเนียม 5% **บวกเพิ่ม** จากค่าจ้าง (client จ่าย 1.05 ETH เมื่อค่าจ้าง 1 ETH) และ snapshot ตอนฝาก

## สิ่งที่ยังต้องตกลงกับทีม

ดูหัวข้อ 10 ของ [`docs/BACKEND_START_ver_0_2.md`](docs/BACKEND_START_ver_0_2.md) เช่น ความยาว `reviewPeriod` / `arbiterTimeout`, สูตร `termsHash`, การแปลงบาท → ETH, ใครเป็น arbiter, milestone
