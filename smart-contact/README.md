# Freelink Escrow — Smart Contract

Escrow สำหรับค่าจ้างงาน Freelance (ERC-20) สร้างด้วย Hardhat 3 + viem + OpenZeppelin v5
ออกแบบตาม [`docs/BACKEND_START_ver.md`](docs/BACKEND_START_ver.md) และ [`docs/FREELINK_ESCROW_GUIDE_TH.md`](docs/FREELINK_ESCROW_GUIDE_TH.md)

> ⚠️ ยังไม่ผ่าน audit ใช้ได้เฉพาะ testnet/demo เท่านั้น

## โครงสร้าง

```
contracts/FreelinkEscrow.sol   contract หลัก
contracts/mocks/MockUSDC.sol   เหรียญปลอม 6 decimals (ทดสอบ/demo)
test/FreelinkEscrow.ts         เทสต์ (node:test + viem)
ignition/modules/              FreelinkEscrow, MockUSDC, FreelinkDemo
scripts/export-abi.ts          ส่งออก ABI ไปที่ abi/ ให้ทีม Frontend
docs/                          เอกสารออกแบบ
```

`Counter.*` และ `scripts/send-op-tx.ts` เป็นตัวอย่างจาก template ของ Hardhat ไม่เกี่ยวกับระบบ

## คำสั่ง

```shell
npm install
npm run build        # compile
npm test             # เทสต์ทั้งหมด
npm run typecheck    # compile แล้ว tsc --noEmit
npm run export-abi   # สร้าง abi/FreelinkEscrow.abi.json
```

## Deploy

### Local (เครือข่ายจำลอง)

```shell
npm run deploy:local
```

### Sepolia

1. ตั้งค่า RPC และ private key ของ wallet ใหม่สำหรับ testnet (ห้ามใช้ wallet ที่มีเงินจริง ห้าม commit):

   ```shell
   npx hardhat keystore set SEPOLIA_RPC_URL
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   ```

   หรือใช้ environment variable ชื่อเดียวกัน (ดู `.env.example`)
2. ต้องมี Sepolia ETH สำหรับ gas (ขอจาก faucet)
3. สร้างไฟล์ parameters (ไม่บังคับ — ถ้าไม่ระบุ arbiter และ feeRecipient จะเป็น deployer, `feeBps` = 250):

   ```json
   { "FreelinkDemoModule": { "arbiter": "0x...", "feeRecipient": "0x...", "feeBps": 250 } }
   ```

4. Deploy:

   ```shell
   npx hardhat ignition deploy ignition/modules/FreelinkDemo.ts --network sepolia --parameters params.json
   ```

`FreelinkDemo` deploy ทั้ง `MockUSDC` และ `FreelinkEscrow` ถ้าจะใช้ ERC-20 ตัวจริงบน testnet ให้ใช้
`ignition/modules/FreelinkEscrow.ts` พร้อม parameter `tokenAddress`

## ส่งมอบให้ Frontend / Backend

- ABI: `npm run export-abi` → `abi/FreelinkEscrow.abi.json`
- ค่าที่ต้องส่ง: address ของ `FreelinkEscrow`, address และ decimals (6) ของเหรียญ, Chain ID (Sepolia = `11155111`)
- `projectId` ต้องเป็น `keccak256(utf8(project.id))` ทุกฝั่ง (ethers: `ethers.id(id)`, viem: `keccak256(stringToHex(id))`)
- ลำดับเรียกฝั่ง client: `token.approve(escrow, amount)` → `depositEscrow(projectId, freelancer, amount, deadline)`

## กติกาของ contract

| ฟังก์ชัน | ผู้เรียก | เงื่อนไข |
| --- | --- | --- |
| `depositEscrow` | client | ยังไม่เคยมี escrow ของ `projectId` นี้, `deadline` อยู่ในอนาคต |
| `submitWork` | freelancer | `Funded` |
| `releasePayment` | client | `Funded` — จ่าย freelancer หักค่าธรรมเนียม |
| `refundClient` | freelancer (ทุกเมื่อ) / client (หลัง deadline และยังไม่ส่งงาน) | `Funded` — คืนเต็มจำนวน |
| `openDispute` | client / freelancer | `Funded` |
| `resolveDispute` | arbiter | `Disputed` |
| `setFeeBps` / `setArbiter` / `setFeeRecipient` | owner | `feeBps` ≤ 1000 (10%) |

ค่าธรรมเนียมถูก **หักออกจากยอดที่ฝาก** และ snapshot ตอนฝาก การเปลี่ยน `feeBps` ภายหลังไม่กระทบ escrow ที่เปิดอยู่
