# Backend Starter — Solidity Escrow (Freelink) · native ETH · Escrow v2

เอกสารนี้อิงจาก `INTEGRATION.md` (หัวข้อ 1 และ 8) และจากโค้ด Frontend จริงในไฟล์ zip (`src/config/contractConfig.js`, `src/services/blockchain/*`, `src/pages/client/EscrowPayment.jsx`)
ครอบคลุมเฉพาะส่วน **Smart Contract (Solidity)** ที่เป็นงานของคุณ ส่วน REST API (`/jobs`, `/auth/me` ฯลฯ) เป็นงานของคนที่ทำ Backend/DB

> ⚠️ ชื่อฟังก์ชัน, event, ค่าธรรมเนียม และพารามิเตอร์เป็น **ข้อเสนอ** ที่ยังต้องตกลงกับทีม (ดูหัวข้อ 10)
> ✅ **Contract v2 + ขั้นตอนขอแก้งาน** compile ได้และผ่านเทสต์ **55 เคส** (TypeScript + viem) บน Hardhat 3.21.1 / solc 0.8.34 · `tsc --noEmit` สะอาด · รัน `scripts/deploy.ts` บนเครือข่ายจำลองสำเร็จ · ต่อ Sepolia ผ่าน RPC สาธารณะได้ (ทดสอบด้วย key ทิ้งที่ไม่มีเหรียญ จึงหยุดที่ "gas required exceeds allowance (0)" ตามคาด)
> 🧪 ลอง "แกล้งแก้ contract ให้พัง" รวม 9 จุด (4 จุดของแกนหลัก + 5 จุดของขั้นตอนขอแก้งาน) เทสต์จับได้ทุกจุด แปลว่าเทสต์ไม่ได้ผ่านเพราะหละหลวม
> 🚧 ยังไม่ได้ deploy จริงบน Sepolia และยังไม่ได้ทดสอบกับ Frontend จริง · ค่า policy ใหม่ (ช่วงตรวจรับ, timeout ของ arbiter, เวลาแก้งาน, จำนวนรอบแก้งาน) เป็นข้อเสนอที่ต้องให้ทีมยืนยัน (ดูหัวข้อ 10)
> 🔄 **ปรับให้ตรงกับโค้ดใน repo เมื่อ 31 ต.ค. 2026:** เพิ่ม `requestRevision` (constructor 7 ค่า, ฟิลด์ `revisionCount`), เปลี่ยนเครื่องมือเป็น Hardhat 3 + viem + TypeScript, สคริปต์ deploy เป็น `deploy.ts`, ชื่อ keystore ตามที่ใช้จริง และเพิ่มวิธีขอ RPC / private key / Sepolia ETH (หัวข้อ 3)
> ⛔ ยังไม่ผ่านการ audit ใช้ได้เฉพาะ testnet/demo ห้ามใช้กับเงินจริง

## สิ่งที่เปลี่ยนจากเวอร์ชันก่อน

| เรื่อง | เวอร์ชันก่อน | เวอร์ชันนี้ | เหตุผล |
| --- | --- | --- | --- |
| สกุลเงิน | ERC-20 (MockUSDC) | **native ETH บน Sepolia** | Frontend รองรับเฉพาะ native; ถ้าเป็น `erc20` จะ throw "ยังไม่ได้เตรียมลำดับ approve()" |
| การฝากเงิน | `approve` แล้วค่อย `depositEscrow` (2 ขั้น) | `depositEscrow` ขั้นเดียว แนบ ETH ไปกับ transaction | ผู้ใช้กดครั้งเดียว |
| ค่าธรรมเนียม | 2.5% หักจากยอดที่ freelancer ได้ | **5% บวกเพิ่มจากค่าจ้าง** (client จ่ายรวม 105%) | ตรงกับ `EscrowPayment.jsx`: `total = budget + fee` |
| `openDispute` | `(projectId)` | `(projectId, reason)` | Frontend ส่ง `reason` มาด้วย |
| ค่าธรรมเนียมกับ escrow เดิม | เปลี่ยน `feeBps` มีผลกับ escrow ที่ฝากไปแล้ว | **snapshot ตอนฝาก** | กันการเปลี่ยนค่าหลังฝากเงิน |
| เครื่องมือ | Hardhat v2 | **Hardhat v3 + viem + TypeScript** | โปรเจกต์ใน repo ใช้ `hardhat-toolbox-viem` เทสต์รันด้วย `node:test` เป็นไฟล์ `.ts` ไม่ใช่ ethers/mocha (หัวข้อ 3, 6, 7) |
| ยอดค่าจ้าง | contract เดาจาก `msg.value` | client ระบุ `amount` เอง และต้องแนบ `amount + fee` พอดี | ค่าจ้างที่ตกลงต้องไม่ถูกคำนวณถอยหลัง (ข้อ 3 ในหัวข้อ 4.6) |
| คีย์ของ escrow | `projectId` | `escrowId = keccak256(client, projectId)` | คนอื่นจอง `projectId` ขวางไม่ได้ (ข้อ 2) |
| การยอมรับงาน | ไม่มี | freelancer ต้อง `acceptEscrow` พร้อมยืนยัน `termsHash` | ยืนยันว่าสองฝ่ายเห็นข้อตกลงฉบับเดียวกัน และ address ผิดไม่ทำให้เงินติด (ข้อ 4) |
| หลังส่งงาน | ล็อกสิทธิ์คืนเงินของ client ทันที | มี **ช่วงตรวจรับ**: client ปล่อย/ปฏิเสธภายในเวลา ไม่งั้น freelancer เบิกเอง | ส่งงานปลอมล็อกเงินถาวรไม่ได้ และ client หายก็ไม่ค้าง (ข้อ 1) |
| Dispute | ตัดสินได้ 100/0 · ไม่มี timeout | แบ่งสัดส่วน 0–100% · timeout → แบ่งครึ่ง · snapshot arbiter | ข้อ 5 |
| ผู้รับเงินที่ปฏิเสธ ETH | ทั้ง transaction ล้ม | บันทึกยอดค้างให้เบิกเอง (`withdraw`) | ผลต่อเนื่องจากการแบ่งเงินสองทาง (ข้อ 5e) |
| ขอแก้งานหลังส่ง | ไม่มี (ส่งงานได้ครั้งเดียว) | **`requestRevision`**: client ขอแก้ได้ภายในช่วงตรวจรับ จำกัด `maxRevisions` ครั้งต่อ escrow (ค่าเริ่มต้น 2) freelancer มีเวลาส่งใหม่ ≥ `revisionPeriod` (ค่าเริ่มต้น 7 วัน) | งานจริงมีรอบแก้ และ UI มี flow นี้อยู่แล้ว (ข้อ 6 ในหัวข้อ 4.6) |
| client ขอเงินคืนหลังเคยส่งงาน | client ขอได้หลัง deadline ถ้ายังไม่ submit | หลังเคยส่งงานแล้ว (รวมระหว่างแก้งาน) ต้อง `openDispute` (`DisputeRequired`) | freelancer ส่งงานไปแล้วอย่างน้อยหนึ่งรอบ ไม่ควรเสียเงินเพราะ client ตั้งเวลาแก้งานสั้น ๆ |

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
| **ขอแก้งาน** (`requestRevision`) | client ขอให้ freelancer แก้งานที่ส่งมา ภายในช่วงตรวจรับ สถานะกลับเป็น `Active` แล้ว freelancer ส่งใหม่ได้ |
| **`revisionPeriod`** | เวลาขั้นต่ำที่ freelancer มีส่งงานแก้ (ตั้งตอน deploy แก้ไม่ได้) contract เป็นคนกำหนด deadline ใหม่ |
| **`maxRevisions`** / **`revisionCount`** | จำนวนครั้งสูงสุดที่ขอแก้ได้ต่อ escrow / จำนวนที่ขอไปแล้ว (นับต่อเนื่อง ไม่รีเซ็ตเมื่อส่งซ้ำ) |
| **bps (basis points)** | หน่วย 1/100 ของ 1% : 500 bps = 5%, 10000 bps = 100% |

---

## 2. สิ่งที่เลือกใช้

| เรื่อง | ตัวเลือก | หมายเหตุ |
| --- | --- | --- |
| ภาษา | Solidity `^0.8.24` (compile ด้วย `0.8.34` ตาม config ของโปรเจกต์) | มี overflow check ในตัว |
| สกุลเงิน | **native ETH** | ไม่ต้อง approve ไม่ต้องมี token |
| Network สำหรับ demo | **Sepolia** (Chain ID `11155111`) | ไม่ใช้เงินจริง |
| Library | OpenZeppelin v5 | `Ownable`, `ReentrancyGuard` |
| เครื่องมือ | **Hardhat v3 + viem + TypeScript** (หรือ Remix IDE สำหรับเริ่มต้น) | ต้องใช้ Node.js ≥ 22.10 · Remix ไม่ต้องติดตั้งอะไร |
| Wallet | MetaMask | Frontend ใช้ `window.ethereum` |

---

## 3. โครงสร้างโปรเจกต์ (Hardhat 3 + viem)

> โปรเจกต์ใน repo (`smart-contact/`) ตั้งค่าไว้แล้ว ใช้ **Hardhat 3 + `hardhat-toolbox-viem` + TypeScript** เทสต์รันด้วย `node:test`
> ข้อกำหนดหลัก: Node.js ≥ 22.10 · โปรเจกต์เป็น ES module (`"type": "module"` ใน `package.json`) · ไฟล์ config เป็น `hardhat.config.ts`
> (ร่างก่อนหน้าของเอกสารนี้ใช้ toolbox แบบ ethers/mocha ซึ่งไม่ตรงกับโปรเจกต์นี้ จึงแก้ให้ตรง)

```
smart-contact/
├─ contracts/
│  ├─ FreelinkEscrow.sol
│  └─ mocks/
│     └─ FreelancerMock.sol      # ใช้ในเทสต์เท่านั้น
├─ scripts/
│  ├─ deploy.ts                  # deploy (อ่านค่า policy จาก .env)
│  └─ export-abi.ts              # ส่งออก ABI → abi/FreelinkEscrow.abi.json
├─ test/
│  └─ FreelinkEscrow.ts          # เทสต์ 55 เคส (node:test + viem)
├─ abi/FreelinkEscrow.abi.json   # สร้างด้วย npm run export-abi
├─ docs/
├─ hardhat.config.ts
├─ .env.example                  # ค่าที่ไม่ลับ ห้ามใส่ key ในไฟล์นี้
├─ .gitignore
└─ package.json                  # มี "type": "module"
```

(`Counter.*`, `ignition/modules/Counter.ts` และ `scripts/send-op-tx.ts` เป็นตัวอย่างจาก template ของ Hardhat ไม่เกี่ยวกับระบบ)

### ติดตั้งและคำสั่งที่ใช้

```bash
node --version          # ต้องได้ v22.10 ขึ้นไป
npm install
```

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run build` | compile contract |
| `npm test` | เทสต์ทั้งหมด (Solidity + TypeScript) |
| `npm run typecheck` | compile แล้ว `tsc --noEmit` |
| `npm run export-abi` | สร้าง `abi/FreelinkEscrow.abi.json` |
| `npm run deploy:local` | deploy บนเครือข่ายจำลองในเครื่อง |
| `npm run deploy:sepolia` | deploy บน Sepolia (ต้องตั้งค่าลับก่อน ดูด้านล่าง) |

ถ้าต้องเริ่มโปรเจกต์ใหม่ ให้ใช้ `npx hardhat --init` เลือกแบบ Hardhat 3 ที่ใช้ `node:test` + `viem` แล้วนำไฟล์ใน `contracts/`, `scripts/`, `test/` มาวาง ส่วนการติดตั้ง OpenZeppelin ใช้ `npm install @openzeppelin/contracts@^5`

### เก็บค่าลับด้วย keystore (แทน `.env`)

Hardhat 3 มี Configuration Variables และ keystore ในตัว ค่าลับจึงไม่ต้องเขียนลงไฟล์ในโปรเจกต์ ชื่อตัวแปรที่ `hardhat.config.ts` ใช้จริง:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY      # เฉพาะถ้าจะ verify บน Etherscan
npx hardhat keystore list                       # ดูว่าตั้งชื่อไหนไว้แล้วบ้าง (ไม่แสดงค่า)
```

- Hardhat จะถามรหัสผ่านของ keystore ตอนตั้งค่าและตอนใช้ค่าเหล่านี้ (เช่นตอน `--network sepolia`) **จำรหัสผ่านนี้ให้ได้**
- `npx hardhat keystore get <ชื่อ>` จะพิมพ์ค่าลับออกหน้าจอ อย่ารันตอนแชร์หน้าจอ
- ถ้าไม่อยากใช้ keystore ตั้งเป็น environment variable ชื่อเดียวกันก็ได้ (ผมทดสอบแล้วว่า `SEPOLIA_RPC_URL` / `SEPOLIA_PRIVATE_KEY` อ่านจาก environment ได้) เหมาะกับ CI ไม่แนะนำให้พิมพ์ key ลงใน shell ที่เก็บประวัติคำสั่ง
- `build` และ `test` บนเครือข่ายจำลองไม่ต้องใช้ค่าเหล่านี้เลย และ `ETHERSCAN_API_KEY` ไม่จำเป็นตอน deploy (ผมยืนยันแล้วว่า build/test ทำงานได้โดยไม่ตั้งค่านี้)
- `keystore set` ตั้งได้ **ทีละชื่อ** ต้องรันแยก 2 ครั้ง (`SEPOLIA_RPC_URL` และ `SEPOLIA_PRIVATE_KEY`) ถ้ารันชื่อเดิมซ้ำจะขึ้นว่า "already exists. Use the --force flag to overwrite it" (ไม่ได้เสียหาย) ถ้าต้องการเขียนทับให้เติม `--force`
- ตอนวางค่าลับ ช่องรับค่าจะซ่อนตัวอักษรและขึ้น `*` หนึ่งตัวต่อหนึ่งตัวอักษร ใช้นับความยาวได้โดยไม่เปิดเผยค่า: private key ที่ขึ้นต้น `0x` ต้องได้ 66 ตัว (ไม่มี `0x` ได้ 64 ตัว) ถ้าขึ้นแค่ตัวเดียวแปลว่าวางไม่สำเร็จ (ใน Windows ลองคลิกขวาหรือ Ctrl+Shift+V) ให้ตั้งใหม่ด้วย `--force`
- ตรวจว่า RPC URL เก็บถูกต้อง: `npx hardhat keystore get SEPOLIA_RPC_URL` (ถ้าเป็น URL สาธารณะพิมพ์ออกหน้าจอได้ แต่ **ห้ามใช้ `get` กับ `SEPOLIA_PRIVATE_KEY`** และถ้า URL มี API key ฝังอยู่ก็อย่าแชร์หน้าจอ)

### วิธีได้ RPC URL, private key และ Sepolia ETH (สำหรับ deploy)

ต้องมี 3 อย่าง: **RPC URL** (ช่องทางคุยกับ Sepolia), **private key** ของ wallet ที่ใช้ deploy และ **Sepolia ETH** ใน wallet นั้นสำหรับจ่าย gas

**1) RPC URL ของ Sepolia**

| ทางเลือก | ขั้นตอน | ข้อดี / ข้อเสีย |
| --- | --- | --- |
| A. RPC สาธารณะ (ไม่ต้องสมัคร) | ใช้ `https://ethereum-sepolia-rpc.publicnode.com` (ผมยิง `eth_chainId` ไปแล้วได้ `0xaa36a7` = 11155111 ถูกต้อง) | เร็วที่สุดสำหรับ deploy ครั้งเดียว · มีจำกัดอัตราการเรียก ไม่เหมาะกับ Backend ที่ฟัง event ตลอด |
| B. ผู้ให้บริการ RPC (Alchemy, Infura ฯลฯ) | สมัครบัญชี → สร้าง app/API key → เลือก network **Ethereum Sepolia** → คัดลอก **HTTPS URL** (ในนั้นมี API key ฝังอยู่) | เสถียรกว่า มีแดชบอร์ดดู request · ต้องสมัคร และ **URL นี้ถือเป็นความลับ** |

เมนูของแต่ละเว็บเปลี่ยนบ่อย ถ้าหน้าจอไม่ตรงกับที่เขียน ให้หาคำว่า "Create app" / "API key" แล้วเลือก Ethereum Sepolia แล้วเก็บ URL ลง keystore: `npx hardhat keystore set SEPOLIA_RPC_URL`

**2) private key ของ wallet สำหรับ deploy**

> ⚠️ ใช้ **wallet ใหม่ที่ไม่เคยมีเงินจริง** เพื่อ testnet เท่านั้น ห้ามส่ง private key ในแชท อีเมล หรือ Git (รวมถึงห้ามส่งให้ผู้ช่วย AI) ใครได้ key ไปคือควบคุม wallet ได้ทั้งหมด

ทางที่ 1 (ง่ายสุด) ใช้ MetaMask:
1. เปิด MetaMask → สร้างบัญชีใหม่ (Add account / Create account) ตั้งชื่อ เช่น `freelink-deployer`
2. เปิดการแสดง test networks แล้วสลับเป็น **Sepolia**
3. คัดลอก **address** ของบัญชีนี้ (ใช้ขอเหรียญในข้อ 3)
4. ส่งออก key: เมนู ⋮ ของบัญชี → Account details → Show private key → ใส่รหัสผ่าน MetaMask → คัดลอก (รูปแบบ `0x` ตามด้วยตัวอักษร hex 64 ตัว)
5. ใส่ใน keystore: `npx hardhat keystore set SEPOLIA_PRIVATE_KEY` แล้ววาง key ตอนที่ถาม

ทางที่ 2 สร้าง wallet ใหม่ด้วยโค้ด (ไม่ต้องเปิด MetaMask) รันในโฟลเดอร์โปรเจกต์:

```bash
node -e "import('viem/accounts').then(({generatePrivateKey,privateKeyToAccount})=>{const k=generatePrivateKey();console.log('address:',privateKeyToAccount(k).address);console.log('key:',k)})"
```

คำสั่งนี้พิมพ์ทั้ง address และ key ออกหน้าจอครั้งเดียว (ผมทดสอบแล้วว่าสร้าง key 66 ตัวอักษรนำหน้า `0x` ได้) ให้คัดลอก key ไปใส่ keystore ทันที แล้วปิดหน้าต่าง terminal ไม่ต้องบันทึกไว้ที่อื่น

**3) Sepolia ETH (ขอฟรีจาก faucet)**

นำ address จากข้อ 2 ไปขอที่ faucet เช่น Alchemy, Google Cloud Web3, Chainlink, Chainstack, QuickNode หรือ PoW faucet (ค้นคำว่า "Sepolia faucet") **เงื่อนไขและจำนวนเหรียญของแต่ละเจ้าเปลี่ยนบ่อยและแหล่งข้อมูลที่ผมค้นเจอขัดกันเอง** บางเจ้าต้องล็อกอินบัญชี หรือมี ETH จริงยอดเล็กน้อยใน mainnet เพื่อกันบอท ให้เปิดหน้าทางการของแต่ละเจ้าอ่านเงื่อนไขก่อน

ต้องขอเท่าไร: deploy `FreelinkEscrow` ใช้ gas ประมาณ **3.6 ล้าน** (ผมวัดบนเครือข่ายจำลอง ด้วย build profile `default`) ที่ gas price 1–10 gwei ก็ราว 0.004–0.04 ETH ขอไว้ **0.1 ETH** ก็เหลือเฟือ และอย่าลืมเผื่อ gas ของการทดสอบฝาก/ปล่อยเงินด้วย ตรวจยอดได้ที่ MetaMask หรือ `https://sepolia.etherscan.io/address/<ADDRESS>`

(ethereum.org ยังระบุว่า Sepolia เป็น testnet ที่แนะนำสำหรับนักพัฒนาแอป ส่วน Holesky เลิกใช้แล้ว อย่าใช้ Holesky)

**4) Etherscan API key (ไม่บังคับ ใช้เฉพาะ verify source)**

สมัครที่ etherscan.io → เมนู API Keys → สร้าง key → `npx hardhat keystore set ETHERSCAN_API_KEY` Etherscan V2 ใช้ key เดียวกับหลายเครือข่าย แต่ผมยังไม่ยืนยันว่าแพ็กเกจฟรีครอบคลุม Sepolia หรือไม่ ดูที่หน้าแพ็กเกจของ Etherscan ก่อน ไม่ได้ verify ก็ใช้งาน contract ได้ปกติ

**5) ตรวจก่อน deploy จริง**

1. `npx hardhat keystore list` ต้องเห็น `SEPOLIA_RPC_URL` และ `SEPOLIA_PRIVATE_KEY`
2. ตรวจว่า wallet มี Sepolia ETH แล้ว
3. คัดลอก `.env.example` เป็น `.env` กรอก `ARBITER_ADDRESS` (wallet ของทีมที่ **ไม่ใช่** client/freelancer ของงานทดสอบ) และ `FEE_RECIPIENT_ADDRESS`
4. `npm run deploy:sepolia` แล้วเก็บ address / Chain ID ที่สคริปต์พิมพ์ออกมา

| อาการ | สาเหตุ / วิธีแก้ |
| --- | --- |
| `gas required exceeds allowance (0)` | wallet ที่ deploy ยังไม่มี Sepolia ETH (ผมเจออาการนี้จริงตอนทดสอบด้วย wallet เปล่า) ไปขอ faucet ก่อน |
| รหัสผ่าน keystore ไม่ตรง | พิมพ์รหัสให้ตรงกับที่ตั้งไว้ ถ้ายังจำรหัสเดิมได้เปลี่ยนด้วย `npx hardhat keystore change-password` |
| เชื่อมต่อ RPC ไม่ได้ / timeout | URL ผิด หรือโดนจำกัดอัตราการเรียก ลอง RPC อีกเจ้า |
| key รั่วหรือเผลอส่งให้คนอื่น | เลิกใช้ wallet นั้นทันที (ถ้ามีเหรียญโอนออกก่อน) แล้วสร้างใหม่ เพราะเป็น testnet จึงไม่เสียเงินจริง |

### `.env.example` (ค่าที่ไม่ลับ ใช้ใน `scripts/deploy.ts`)

```env
# ค่าที่ไม่ลับ — ใช้ใน scripts/deploy.ts (ถ้าไม่ระบุ arbiter/feeRecipient จะเป็น address ของ deployer)
ARBITER_ADDRESS=
FEE_RECIPIENT_ADDRESS=
FEE_BPS=500
REVIEW_PERIOD_SECONDS=604800     # ช่วงตรวจรับหลังส่งงาน (7 วัน) แก้ไม่ได้หลัง deploy
ARBITER_TIMEOUT_SECONDS=1209600  # เวลาที่ arbiter มีเพื่อตัดสิน (14 วัน) แก้ไม่ได้หลัง deploy
REVISION_PERIOD_SECONDS=604800   # เวลาขั้นต่ำที่ freelancer มีส่งงานแก้หลัง client ขอแก้ (7 วัน) แก้ไม่ได้หลัง deploy
MAX_REVISIONS=2                  # จำนวนครั้งที่ client ขอแก้งานได้ต่อ escrow (0 = ปิด, สูงสุด 10) แก้ไม่ได้หลัง deploy

# ค่าลับ (RPC URL, private key, Etherscan key) ห้ามใส่ในไฟล์นี้หรือ .env
# เก็บใน keystore ของ Hardhat แทน:
#   npx hardhat keystore set SEPOLIA_RPC_URL
#   npx hardhat keystore set SEPOLIA_PRIVATE_KEY      # ใช้ wallet ใหม่สำหรับ testnet เท่านั้น
#   npx hardhat keystore set ETHERSCAN_API_KEY        # ถ้าจะ verify
```

### `.gitignore`

```
# Node modules
/node_modules

# Compilation output
/dist

# pnpm deploy output
/bundle

# Hardhat Build Artifacts
/artifacts

# Hardhat compilation (v2) support directory
/cache

# Typechain output
/types

# Environment files
.env
.env.*
!.env.example

# Hardhat coverage reports
/coverage

# Gas snapshot files
/.gas-snapshot

# Snapshot cheatcodes output
/snapshots
```

### `hardhat.config.ts`

```ts
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
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
| `Active` | `refundClient` (freelancer ทุกเมื่อ / client หลัง deadline **และต้องไม่เคยส่งงาน** `revisionCount` = 0) | `Refunded` |
| `Active` | `openDispute` (client, หรือ freelancer ก่อน deadline) | `Disputed` |
| `Submitted` | `releasePayment` (client) หรือ `claimAfterReview` (freelancer หลังพ้นช่วงตรวจรับ) | `Released` |
| `Submitted` | `openDispute` (client ภายในช่วงตรวจรับ = ปฏิเสธงาน) | `Disputed` |
| `Submitted` | `refundClient` (freelancer ยอมยกเลิก) | `Refunded` |
| `Submitted` | `requestRevision` (client ภายในช่วงตรวจรับ ไม่เกิน `maxRevisions` ครั้ง) | `Active` (`revisionCount` +1) |
| `Disputed` | `resolveDispute` (arbiter) หรือ `settleExpiredDispute` (คู่กรณี หลังพ้น timeout) | `Resolved` |

On-chain `Status` → UI:

| On-chain `Status` | `escrowStatus` ใน UI | หมายเหตุ |
| --- | --- | --- |
| `Unfunded` (0) | `unfunded` | ยังไม่มีการฝาก (ค่าเริ่มต้น) |
| `Funded` (1) | `funded` | ฝากแล้ว **รอ freelancer ยอมรับ** |
| `Active` (2) | `funded` + project `in_progress` (ถ้า `revisionCount` > 0 = `revision` กำลังแก้งานตามที่ client ขอ) | freelancer ยอมรับแล้ว กำลังทำงาน / กำลังแก้งาน |
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
| `requestRevision(escrowId, reason)` | client | `Submitted` · ภายในช่วงตรวจรับ · `revisionCount` < `maxRevisions` · deadline ใหม่ = `max(เดิม, ตอนนี้ + revisionPeriod)` (client ตั้งเองไม่ได้) |
| `claimAfterReview` | freelancer | `Submitted` และพ้น `reviewEndsAt` |
| `refundClient` | ดูตาราง 4.2 | `Funded` / `Active` / `Submitted` (client ขอคืนเองตอน `Submitted` ไม่ได้ และถ้าเคยส่งงานแล้ว — `revisionCount` > 0 — ขอเองไม่ได้ ต้อง `openDispute`) |
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
| `RevisionRequested` | project `revision` (มี `reason`, `revisionNumber`, `newDeadline`) · แจ้ง freelancer ให้แก้งานก่อน `newDeadline` และแสดงจำนวนรอบที่เหลือ = `maxRevisions` − `revisionNumber` |
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
- **ข้อแลกเปลี่ยน:** client ต้องเข้ามาตอบภายในเวลาที่กำหนด (ค่าเริ่มต้น 7 วัน) UI ต้องแจ้งเตือน · `deadline` กลายเป็น "เส้นตายส่งงาน" ส่งช้าไปแม้วินาทีเดียวจะส่งผ่าน contract ไม่ได้ (client ยังปล่อยเงินให้งานที่ส่งช้านอกระบบได้) · ส่งงานซ้ำได้เฉพาะเมื่อ client ขอแก้ผ่าน `requestRevision` (ข้อ 6)

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

#### ข้อ 6 — ส่งงานไปแล้วแก้ไม่ได้ (เพิ่มเมื่อ 31 ต.ค. 2026)

- **เหตุ:** ฉบับก่อนหน้าส่งงานได้ครั้งเดียว ไม่พอใจต้อง dispute แต่ Frontend มี flow "ขอแก้ไขงาน → ส่งงานใหม่" อยู่แล้ว (ปุ่มขอแก้ไข สถานะ `revision`) ถ้า client กดขอแก้ (ฝั่ง API อย่างเดียว) นาฬิกาช่วงตรวจรับบน chain ยังเดินต่อ พอครบ freelancer เบิกเงินเองได้ทั้งที่งานยังไม่ได้แก้ และส่งใหม่บน chain ไม่ได้
- **ผล (สิ่งที่ทำ):** `requestRevision(escrowId, reason)` ให้ client ขอแก้ได้ตอน `Submitted` ภายในช่วงตรวจรับ สถานะกลับเป็น `Active` และนับ `revisionCount` freelancer ส่งใหม่ด้วย `submitWork` เดิม ช่วงตรวจรับเริ่มนับใหม่
- **ทำไมเลือกทางนี้ (และกันช่องโหว่ 3 จุด):**
  1. **deadline ใหม่ contract กำหนดเอง** = `max(deadline เดิม, ตอนนี้ + revisionPeriod)` ถ้าให้ client ตั้งเอง client จะตั้งสั้นมากแล้วรอหมดเวลาขอเงินคืนเต็มจำนวนได้ทั้งที่รับงานไปแล้ว
  2. **จำกัดจำนวนรอบ** `maxRevisions` (ค่าเริ่มต้น 2) **ต่อ escrow** นับต่อเนื่องไม่รีเซ็ตเมื่อส่งซ้ำ → ส่งงานได้สูงสุด 3 รอบ (รอบแรก + แก้ 2 ครั้ง) กันการขอแก้ไม่รู้จบเพื่อไม่ต้องจ่าย ครบแล้ว client เหลือปล่อยเงินหรือ `openDispute` และ `maxRevisions = 0` ปิดฟีเจอร์
  3. **หลังเคยส่งงาน client ขอเงินคืนเองไม่ได้** (`DisputeRequired`) แม้ freelancer ไม่ส่งงานแก้ทัน ต้องเปิด dispute ให้ arbiter ตัดสินแบ่งสัดส่วน เพราะ freelancer ส่งงานไปแล้วอย่างน้อยหนึ่งรอบ ส่วน freelancer ยังยกเลิกคืนเงินได้ทุกเมื่อ และเปิด dispute ได้ตอน `Active` ก่อน deadline ตามเดิม
- **ที่ไม่ให้ทำ:** freelancer แก้งานเองโดยไม่ถูกขอไม่ได้ (`submitWork` ต้องสถานะ `Active`) กันเปลี่ยนไฟล์ที่ client กำลังตรวจหรือรีเซ็ตเวลาตรวจรับ
- **ข้อแลกเปลี่ยน:** ปล่อยเงินอาจช้าลงได้ภายในรอบที่เหลือ (ช่วงตรวจรับต่อรอบ + เวลาแก้งาน) · `reason` อยู่บน chain ถาวรเหมือน `reason` ของ dispute · ค่า `revisionPeriod` และ `maxRevisions` แก้ไม่ได้หลัง deploy (`immutable`) ต้องตกลงกับทีมก่อน (หัวข้อ 10)

#### สิ่งที่ยังเปิดอยู่ในดีไซน์นี้

- freelancer ที่เปิด dispute ก่อน deadline ตอน `Active` แล้วหวังให้ arbiter เงียบ จะได้ 50% เมื่อ timeout จึงต้องมี arbiter ที่ตอบสนองจริง ซึ่งเป็นเรื่องกระบวนการ ไม่ใช่เรื่องโค้ด
- arbiter ยังเป็นจุดรวมศูนย์ที่ต้องไว้ใจ ควรเป็น multisig เมื่อขึ้น production
- ยังไม่มี milestone หรือการขยาย deadline ตามอำเภอใจ (deadline ขยายได้เฉพาะผ่านการขอแก้งาน)

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
///      ระหว่างช่วงตรวจรับ client ขอแก้งานได้ (requestRevision) สูงสุด maxRevisions รอบต่อ escrow:
///      Submitted → Active (freelancer มีเวลา revisionPeriod ส่งใหม่) → Submitted ...
///      client จ่าย "ค่าจ้าง + ค่าธรรมเนียม" ใน msg.value ตอนฝาก โดยระบุ amount (ค่าจ้าง) เอง
///      ถ้า msg.value ไม่เท่ากับ amount + fee ณ ขณะนั้น transaction จะ revert (ไม่เดาแทน client)
contract FreelinkEscrow is Ownable, ReentrancyGuard {
    // ---------- Types ----------
    enum Status {
        Unfunded,  // 0: ยังไม่มี escrow (ค่าเริ่มต้นของ mapping)
        Funded,    // 1: ฝากแล้ว รอ freelancer ยอมรับเงื่อนไข
        Active,    // 2: freelancer ยอมรับแล้ว กำลังทำงาน (หรือกำลังแก้งานหลัง requestRevision ดู revisionCount)
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
        uint8 revisionCount;  // จำนวนครั้งที่ client ขอแก้งานแล้ว (นับต่อ escrow ไม่รีเซ็ตเมื่อส่งซ้ำ)
        Status status;
    }

    // ---------- Constants / immutables ----------
    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 1000;           // เพดานค่าธรรมเนียม 10%
    uint64 public constant MAX_DURATION = 365 days;      // deadline ห่างจากวันฝากได้ไม่เกิน 1 ปี
    uint16 public constant TIMEOUT_FREELANCER_BPS = 5000; // arbiter เงียบเกินกำหนด → แบ่งครึ่ง
    uint8 public constant MAX_REVISION_LIMIT = 10;        // เพดานจำนวนรอบแก้งานที่ตั้งได้ตอน deploy

    uint64 public immutable reviewPeriod;    // ช่วงที่ client ตรวจรับหลังส่งงาน
    uint64 public immutable arbiterTimeout;  // เวลาที่ arbiter มีเพื่อตัดสินหลังเปิด dispute
    uint64 public immutable revisionPeriod;  // เวลาขั้นต่ำที่ freelancer มีส่งงานแก้หลัง client ขอแก้
    uint8 public immutable maxRevisions;     // จำนวนครั้งที่ขอแก้งานได้ต่อ escrow (0 = ปิดฟีเจอร์)

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
    error InvalidLimit();
    error AlreadyExists();
    error WrongPayment(uint256 expected, uint256 sent);
    error NotYetRefundable();
    error DeadlinePassed();
    error ReviewPeriodActive();
    error ReviewPeriodOver();
    error RevisionLimitReached();
    error DisputeRequired();
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
    event RevisionRequested(bytes32 indexed escrowId, uint8 revisionNumber, string reason, uint64 newDeadline);
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
        uint64 arbiterTimeout_,
        uint64 revisionPeriod_,
        uint8 maxRevisions_
    ) Ownable(msg.sender) {
        if (arbiter_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (reviewPeriod_ == 0 || reviewPeriod_ > 30 days) revert InvalidDuration();
        if (arbiterTimeout_ == 0 || arbiterTimeout_ > 90 days) revert InvalidDuration();
        if (revisionPeriod_ == 0 || revisionPeriod_ > 30 days) revert InvalidDuration();
        if (maxRevisions_ > MAX_REVISION_LIMIT) revert InvalidLimit();
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        reviewPeriod = reviewPeriod_;
        arbiterTimeout = arbiterTimeout_;
        revisionPeriod = revisionPeriod_;
        maxRevisions = maxRevisions_;
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

    /// @notice client ขอให้แก้งานที่ส่งมา (ทำได้เฉพาะตอน Submitted และภายในช่วงตรวจรับ)
    ///         สถานะกลับเป็น Active และ deadline ถูกขยายอย่างน้อย revisionPeriod นับจากตอนนี้
    ///         deadline ใหม่ถูกกำหนดโดย contract (client ตั้งเองไม่ได้ กันตั้งสั้นแล้วรอขอเงินคืน)
    ///         ขอได้สูงสุด maxRevisions ครั้งต่อ escrow เกินแล้วต้องปล่อยเงินหรือเปิด dispute
    function requestRevision(bytes32 escrowId, string calldata reason) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client) revert NotAuthorized();
        if (e.status != Status.Submitted) revert InvalidStatus();
        if (block.timestamp > e.reviewEndsAt) revert ReviewPeriodOver();
        if (e.revisionCount >= maxRevisions) revert RevisionLimitReached();

        e.revisionCount += 1;
        e.status = Status.Active;
        e.reviewEndsAt = 0;
        uint64 minDeadline = uint64(block.timestamp) + revisionPeriod;
        if (e.deadline < minDeadline) e.deadline = minDeadline;

        emit RevisionRequested(escrowId, e.revisionCount, reason, e.deadline);
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
    ///  - client เรียกได้หลัง deadline ถ้ายังทำงานอยู่ (Active) และไม่เคยส่งงาน — หลังส่งงานแล้ว
    ///    (รวมถึงระหว่างแก้งาน) ต้องใช้ openDispute
    function refundClient(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        Status s = e.status;
        if (s != Status.Funded && s != Status.Active && s != Status.Submitted) revert InvalidStatus();

        if (msg.sender == e.freelancer) {
            // ok
        } else if (msg.sender == e.client) {
            if (s == Status.Submitted) revert InvalidStatus();
            // เคยส่งงานแล้ว (อยู่ระหว่างแก้งาน) → ขอเงินคืนเองไม่ได้ ต้องเปิด dispute ให้ arbiter ตัดสิน
            if (s == Status.Active && e.revisionCount > 0) revert DisputeRequired();
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

ชุดเทสต์ **55 เคส** (ไฟล์ `test/FreelinkEscrow.ts`) ครอบคลุม:

- **ฝากเงิน:** flow ปกติ · ยอดไม่ตรง (`WrongPayment`) · owner ปรับค่าธรรมเนียมกลางทาง · พารามิเตอร์ผิด · arbiter เป็นคู่กรณี · คนอื่นจอง `projectId` ไม่ได้ · ฝากซ้ำ · ส่ง ETH ตรงๆ
- **ยอมรับงาน:** ผู้เรียก/`termsHash` ผิด · หลัง deadline · ยกเลิกก่อน accept (address freelancer ผิดไม่ทำให้เงินติด)
- **ส่งงานและช่วงตรวจรับ:** ส่งงานปลอมล็อกเงินไม่ได้ · client เงียบ → freelancer เบิกเอง · เปิด dispute หลังพ้นช่วงตรวจรับไม่ได้
- **ขอแก้งาน (`requestRevision`):** กลับ `Active` + นับรอบ + ขยาย deadline · ส่งใหม่แล้วนับช่วงตรวจรับใหม่ · ครบจำนวนรอบแล้วขอเพิ่มไม่ได้แต่ยังปล่อยเงิน/dispute ได้ · เฉพาะ client / เฉพาะ `Submitted` / เฉพาะในช่วงตรวจรับ · deadline ที่ไกลอยู่แล้วไม่ถูกย่อ · หลังเคยส่งงาน client ขอเงินคืนเองไม่ได้ (ต้อง dispute) · freelancer ยังยกเลิก/เปิด dispute ได้ · ไม่เคยส่งงาน client ยังขอคืนหลัง deadline ได้ · `maxRevisions = 0` ปิดฟีเจอร์
- **คืนเงิน:** สิทธิ์ของแต่ละฝ่ายตามสถานะ
- **Dispute:** ตัดสิน 100% / 0% / 60-40 · timeout แบ่งครึ่ง · snapshot arbiter · ConflictOfInterest · freelancer ขวางสิทธิ์คืนเงินหลัง deadline ไม่ได้
- **ผู้รับเป็น contract:** ปฏิเสธ ETH → ยอดค้างและเบิกเองได้ · พยายาม re-enter → ถูกบล็อก
- **แอดมินและ constructor:** สิทธิ์ owner · เพดานค่าต่างๆ · ค่าเริ่มต้นถูกต้อง
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

### `test/FreelinkEscrow.ts`

โค้ดเทสต์ทั้งไฟล์อยู่ใน repo (ยาวกว่า 1,000 บรรทัด จึงไม่คัดลอกมาทั้งหมดในเอกสาร) ร่างเก่าของเอกสารนี้เป็น ethers/mocha (JS) ซึ่งใช้กับ constructor ใหม่ไม่ได้แล้ว สิ่งที่ต่างจาก Hardhat 2 / ethers เดิม:

| เรื่อง | ร่างเดิม (ethers + mocha) | โปรเจกต์นี้ (viem + node:test) |
| --- | --- | --- |
| Import | `require(...)` / `chai` | `import ...` · `node:assert/strict` · `node:test` |
| Network | `ethers`, `networkHelpers` จาก `network.create()` | `viem`, `networkHelpers` จาก `network.create()` |
| เรียกฟังก์ชัน | `contract.connect(signer).fn(args, {value})` | `contract.write.fn([args], { account, value })` |
| ตรวจ revert | `.to.be.revertedWithCustomError(c, "X")` | `viem.assertions.revertWithCustomError(promise, c, "X")` |
| ตรวจ event | `.to.emit(c, "E").withArgs(...)` | `viem.assertions.emitWithArgs(promise, c, "E", [...])` |
| ตรวจยอดเงิน | `changeEtherBalances(ethers, [...], [...])` | ฟังก์ชันช่วย `exec(send, watch)` อ่านยอดก่อน/หลังและบวก gas ของผู้ส่งกลับ |
| Fixture | เรียก `setup()` ทุกเทสต์ | `networkHelpers.loadFixture(namedFn)` (snapshot) |
| Address | ตัวพิมพ์ตามที่ ethers ให้ | wallet ของ Hardhat เป็นตัวพิมพ์เล็ก ต้อง `getAddress()` ก่อนเทียบกับค่าใน event |

ตัวอย่างสั้น ๆ (เทสต์ขอแก้งาน):

```ts
it("ขอแก้ได้ maxRevisions ครั้งต่อ escrow (ส่งงานได้ 3 รอบ) ครั้งที่ 3 ถูกปฏิเสธ แต่ยังปล่อยเงินได้", async () => {
  const c = await networkHelpers.loadFixture(submitted);
  for (let i = 1; i <= MAX_REVISIONS; i++) {
    await requestRevision(c);
    await resubmit(c, `v${i + 1}`);
  }
  await viem.assertions.revertWithCustomError(requestRevision(c), c.escrow, "RevisionLimitReached");

  const { deltas } = await exec(
    () => c.escrow.write.releasePayment([c.escrowId], as(client)),
    [A(freelancer), A(treasury)],
  );
  assert.deepEqual(deltas, [WAGE, FEE]);
});
```

รัน:

```bash
npm run build      # compile contract
npm test           # เทสต์ทั้งหมด
npm run typecheck  # compile แล้ว tsc --noEmit
```

ผลที่ได้จริง: **58 passing** (Solidity 3 จาก template + TypeScript 55) บน Hardhat 3.21.1 + solc 0.8.34

เพื่อยืนยันว่าเทสต์ไม่ได้ผ่านเพราะหละหลวม ผมลองแกะโค้ด contract ให้พังทีละจุดแล้วรันเทสต์ ทุกจุดถูกจับได้:

| ถ้าแก้ contract ให้ผิดอย่างนี้ | เทสต์ที่ fail |
| --- | --- |
| freelancer เปิด dispute หลัง deadline ได้ | ≥ 1 เคส |
| client ขอคืนเงินเองตอน `Submitted` ได้ | ≥ 1 เคส |
| คิดส่วนของ client / ค่าธรรมเนียมผิด | ≥ 1 เคส |
| ไม่ snapshot arbiter ตอนเปิด dispute | ≥ 1 เคส |
| ขอแก้งานแล้วไม่ขยาย deadline | ≥ 1 เคส |
| ไม่จำกัดจำนวนรอบขอแก้งาน | ≥ 2 เคส |
| client ขอเงินคืนเองได้หลังเคยส่งงาน (ไม่มี `DisputeRequired`) | ≥ 1 เคส |
| ไม่ล้าง `reviewEndsAt` ตอนขอแก้ | ≥ 1 เคส |
| ขอแก้ได้แม้พ้นช่วงตรวจรับแล้ว | ≥ 1 เคส |

> ข้อจำกัด: เทสต์พิสูจน์ได้เฉพาะสิ่งที่เขียนไว้ และยังไม่มี fuzz test / invariant test เต็มรูปแบบ ก่อนขึ้น mainnet ควรเพิ่มและให้ผู้เชี่ยวชาญ audit

---

## 7. Deploy

### `scripts/deploy.ts`

```ts
// Deploy FreelinkEscrow v2 (native ETH)
//   เครือข่ายจำลองในเครื่อง: npx hardhat run scripts/deploy.ts
//   Sepolia:                 npx hardhat run scripts/deploy.ts --network sepolia
// ค่า policy อ่านจาก environment variable (ดู .env.example) ถ้าไม่ระบุใช้ค่าเริ่มต้นด้านล่าง
import { network } from "hardhat";
import { getAddress } from "viem";

// Hardhat 3 ไม่โหลด .env ให้เอง — โหลดเองถ้ามีไฟล์ (Node >= 22)
try {
  process.loadEnvFile(".env");
} catch {
  // ไม่มี .env ก็ใช้ค่าเริ่มต้น
}

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();

console.log("Network :", networkName);
console.log("Deployer:", deployer.account.address);

// ถ้าไม่กำหนดใน .env จะใช้ address ของ deployer เองเป็น arbiter / ผู้รับค่าธรรมเนียม (เหมาะกับ demo เท่านั้น)
const arbiter = (process.env.ARBITER_ADDRESS || deployer.account.address) as `0x${string}`;
const feeRecipient = (process.env.FEE_RECIPIENT_ADDRESS || deployer.account.address) as `0x${string}`;
const feeBps = Number(process.env.FEE_BPS || 500); // 500 = 5%
const reviewPeriod = BigInt(process.env.REVIEW_PERIOD_SECONDS || 7 * 24 * 3600); // client มีเวลาตรวจรับ 7 วัน
const arbiterTimeout = BigInt(process.env.ARBITER_TIMEOUT_SECONDS || 14 * 24 * 3600); // arbiter มีเวลา 14 วัน
const revisionPeriod = BigInt(process.env.REVISION_PERIOD_SECONDS || 7 * 24 * 3600); // freelancer มีเวลาแก้งานอย่างน้อย 7 วัน
const maxRevisions = Number(process.env.MAX_REVISIONS ?? 2); // client ขอแก้ได้ 2 ครั้งต่อ escrow (0 = ปิด)

const escrow = await viem.deployContract("FreelinkEscrow", [
  arbiter,
  feeRecipient,
  feeBps,
  reviewPeriod,
  arbiterTimeout,
  revisionPeriod,
  maxRevisions,
]);

const chainId = await publicClient.getChainId();

const address = getAddress(escrow.address);

console.log("FreelinkEscrow:", address);
console.log("Chain ID      :", chainId);
console.log("\nนำค่าไปใส่ใน .env ของ Frontend:");
console.log(`VITE_CHAIN_ID=${chainId}`);
console.log(`VITE_CONTRACT_ADDRESS=${address}`);
console.log("\nค่า constructor (ใช้กับคำสั่ง verify):");
console.log(
  arbiter,
  feeRecipient,
  feeBps,
  reviewPeriod.toString(),
  arbiterTimeout.toString(),
  revisionPeriod.toString(),
  maxRevisions,
);
```

```bash
npm run deploy:local      # เครือข่ายจำลองในเครื่อง ไว้ลองก่อน (ผมรันแล้วสำเร็จ)
npm run deploy:sepolia    # Sepolia (เทียบเท่า npx hardhat run scripts/deploy.ts --network sepolia)
```

ต้องมี RPC URL, private key และ Sepolia ETH ก่อน — ดูวิธีได้มาที่หัวข้อ 3 ("วิธีได้ RPC URL, private key และ Sepolia ETH")

> `reviewPeriod`, `arbiterTimeout`, `revisionPeriod` และ `maxRevisions` เป็นค่าที่ **แก้ไม่ได้หลัง deploy** (`immutable`) ถ้าอยากเปลี่ยนต้อง deploy ใหม่ ซึ่ง escrow เดิมจะอยู่กับ contract เก่า ดังนั้นตกลงค่ากับทีมก่อน (หัวข้อ 10)
> ช่วงค่าที่ constructor ยอมรับ: `reviewPeriod` 1 วินาที–30 วัน · `arbiterTimeout` 1 วินาที–90 วัน · `revisionPeriod` 1 วินาที–30 วัน · `maxRevisions` 0–10 (`0` = ปิดการขอแก้งาน) นอกช่วงนี้ deploy ไม่ผ่าน (`InvalidDuration` / `InvalidLimit`)
> ถ้าจะ demo ให้เห็นผลเร็ว ควร deploy อีกชุดที่ตั้งเวลาสั้น ๆ (เช่น ช่วงตรวจรับไม่กี่นาที) แยกจากชุดที่ใช้ค่าจริง

> บทเรียนทางการของ Hardhat 3 ใช้ **Hardhat Ignition** สำหรับ deploy ในโปรเจกต์นี้ใช้สคริปต์ธรรมดาเพราะเข้าใจง่ายกว่าสำหรับมือใหม่และอ่านค่า policy จาก `.env` ได้ตรง ๆ

ถ้าต้องการ verify source บน Etherscan (ให้คนอ่านโค้ดบน explorer ได้) ต้องตั้ง `ETHERSCAN_API_KEY` ใน keystore ไว้แล้ว (ดูหัวข้อ 3) จากนั้นส่งค่า constructor ต่อท้ายตรงๆ **ครบ 7 ค่าตามลำดับเดียวกับที่สคริปต์พิมพ์** (ขั้นตอน verify ผมยังไม่ได้ลองกับ Etherscan จริง):

```bash
npx hardhat verify --network sepolia <ESCROW_ADDRESS> <ARBITER> <FEE_RECIPIENT> <FEE_BPS> <REVIEW_PERIOD_SECONDS> <ARBITER_TIMEOUT_SECONDS> <REVISION_PERIOD_SECONDS> <MAX_REVISIONS>
```

Etherscan V2 ใช้ API key เดียวกับทุกเครือข่าย

### ทางลัด: ใช้ Remix IDE

1. เปิด https://remix.ethereum.org สร้างไฟล์ `FreelinkEscrow.sol` แล้ววางโค้ดจากหัวข้อ 5 (Remix ดึง `@openzeppelin/contracts` ให้เองตาม import)
2. แท็บ **Solidity Compiler** → เลือกเวอร์ชัน `0.8.24` ขึ้นไป (โปรเจกต์ใช้ `0.8.34`) → Compile
3. แท็บ **Deploy & Run** → Environment: **Injected Provider – MetaMask** (สลับ MetaMask เป็น Sepolia ก่อน)
4. กรอก constructor **7 ช่อง**: `arbiter_`, `feeRecipient_`, `feeBps_`, `reviewPeriod_`, `arbiterTimeout_`, `revisionPeriod_`, `maxRevisions_` (เช่น address ของคุณเอง, address ของคุณเอง, `500`, `604800`, `1209600`, `604800`, `2`) แล้วกด Deploy
5. คัดลอก ABI จากแท็บ Compiler (ปุ่ม ABI) และ address จากรายการ Deployed Contracts

---

## 8. ส่งมอบให้ Frontend

### 8.1 ABI

รัน `npm run export-abi` จะได้ไฟล์ `abi/FreelinkEscrow.abi.json` (เฉพาะ `abi`) พร้อมส่งให้ Frontend หรือจะใช้ `artifacts/contracts/FreelinkEscrow.sol/FreelinkEscrow.json` → field `abi` หลัง `npx hardhat build` ก็ได้ **ทุกครั้งที่แก้ contract ต้อง export ใหม่** (ฉบับที่มี `requestRevision` ต่างจากฉบับก่อนหน้า)

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
  requestRevision: "requestRevision",
  settleExpiredDispute: "settleExpiredDispute",
  withdraw: "withdraw",
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
| 11 | **ขั้นตอนขอแก้งาน** | มี flow ครบฝั่ง API/UI (ปุ่ม "ขอแก้ไขงาน", สถานะ `revision`, ส่งซ้ำ) แต่ไม่เรียก contract | ปุ่มขอแก้เรียก `requestRevision(escrowId, reason)` · ปุ่มส่งใหม่เปิดเมื่อ on-chain เป็น `Active` · แสดงรอบที่เหลือ (`maxRevisions - revisionCount`) และ deadline ใหม่ · ซ่อนปุ่มเมื่อครบรอบ |

> รายละเอียดจากการตรวจ Frontend จริง (พร้อมเลขบรรทัดและข้อเสนอแก้) อยู่ใน [`FRONTEND_REVIEW_TH.md`](FRONTEND_REVIEW_TH.md) เช่น ตอนนี้ Frontend ส่งยอด **บาท** เข้า `parseUnits` เป็น ETH และไม่ตรวจ network ก่อนส่ง transaction ต้องแก้ก่อนต่อ contract จริง

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
| `ReviewPeriodOver` | พ้นช่วงตรวจรับแล้ว เปิดข้อพิพาท/ขอแก้งานไม่ได้ |
| `RevisionLimitReached` | ขอแก้งานครบจำนวนครั้งแล้ว เหลือปล่อยเงินหรือเปิดข้อพิพาท |
| `DisputeRequired` | เคยส่งงานแล้ว ขอเงินคืนเองไม่ได้ ต้องเปิดข้อพิพาท |
| `DisputeNotExpired` | arbiter ยังมีเวลาตัดสิน |
| `ConflictOfInterest` | ผู้ตัดสินเป็นคู่กรณีของรายการนี้ (แจ้งผู้ดูแลระบบ) |
| `InvalidAmount` / `InvalidAddress` / `InvalidDeadline` / `InvalidShare` / `InvalidDuration` / `InvalidLimit` | ข้อมูลที่ส่งมาไม่ถูกต้อง |
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
- [x] ขอแก้งานหลังส่ง: เพิ่ม `requestRevision` แล้ว (ตัดสินใจ 31 ต.ค. 2026) ขอแก้ได้ **2 ครั้งต่อ escrow** (ส่งงานได้สูงสุด 3 รอบ) และ freelancer มีเวลาอย่างน้อย **7 วัน** ต่อรอบ
- [ ] **ยืนยันค่า `maxRevisions` (2) และ `revisionPeriod` (7 วัน)** กับทีม — แก้ไม่ได้หลัง deploy · ออกแบบ UI แสดงรอบที่เหลือและเวลาที่เหลือให้ทั้งสองฝ่ายเห็น
- [ ] **ความยาว `reviewPeriod`** (ตอนนี้ค่าเริ่มต้น 7 วัน แก้ไม่ได้หลัง deploy) พร้อมออกแบบการแจ้งเตือน client ก่อนหมดเวลา
- [ ] **ความยาว `arbiterTimeout`** (ค่าเริ่มต้น 14 วัน) และยืนยันว่ารับผล **แบ่งครึ่ง** เมื่อ arbiter เงียบได้
- [ ] **สูตร `termsHash`**: hash อะไรบ้าง (เช่น ชื่องาน + ขอบเขต + ราคา + deadline) และเก็บข้อความต้นฉบับไว้ที่ไหนเพื่อให้ arbiter เปิดดูได้
- [ ] **วิธีแปลงบาท → ETH**: ตัวเลือกง่ายสุดสำหรับ demo คือตั้ง "อัตราคงที่" ในไฟล์ config (เช่น 1 ETH = X บาท) ส่วนการดึงราคาจริงต้องใช้ price oracle ซึ่งซับซ้อนกว่า
- [ ] ใครเป็น arbiter (wallet เดียว หรือ multisig) ขั้นตอนตัดสิน dispute และ **ต้องตัดสินภายในกี่วัน**
- [ ] ค่าธรรมเนียม: ตอนนี้ **5% บวกเพิ่ม** (ตรงกับ UI) ยืนยันหรือเปลี่ยน และ address ผู้รับ
- [ ] นโยบายเมื่อ **ส่งงานช้ากว่า deadline**: ตอนนี้ส่งผ่าน contract ไม่ได้ (client ปล่อยเงินเองได้) ตกลงว่าพอหรือต้องเพิ่มฟังก์ชันขยายเวลา
- [ ] ระบบมีงานหลาย milestone หรือไม่ (ตอนนี้จ่ายก้อนเดียว; mock ใน Frontend สร้าง 1 milestone ยอดเต็มตอนจ้าง) ถ้าอยากแบ่งงวด ทางที่ใช้ contract เดิมได้คือ 1 milestone = 1 escrow (ใช้ `projectId` ต่างกันต่องวด)
- [ ] Wallet address ของ **freelancer และ client** จะเก็บที่ไหนและให้ใครกรอก (ต้องใช้คำนวณ `escrowId`)
- [ ] Backend ต้องตรวจ `EscrowFunded` ว่า client/freelancer/`termsHash` ตรงกับงานใน DB ก่อนผูก `escrowId` (หัวข้อ 4.6 ข้อ 2)
- [ ] RPC URL สาธารณะที่ใช้ demo
- [ ] วิธีเก็บ mapping `projectId` (string) ↔ `bytes32`

---

## 11. หมายเหตุด้านความปลอดภัย

- Contract นี้ยังไม่ผ่าน audit ใช้ได้เฉพาะ testnet/demo
- Arbiter มีอำนาจตัดสินเงินในข้อพิพาท จึงควรเป็น multisig ถ้าขึ้น production และต้องมีกระบวนการตัดสินที่ตอบสนองได้ทันเวลา (ไม่เช่นนั้นผลจะเป็นการแบ่งครึ่งตามกติกา timeout)
- การโอน ETH ใช้ `call` พร้อมกลไกยอดค้าง (`pendingWithdrawals`): ผู้รับที่ปฏิเสธ ETH ไม่ขวางผู้อื่นแล้ว แต่ผู้รับที่เป็น contract อาจใช้ gas ที่ได้รับหมดเพื่อกวน ผู้เรียกจะเสีย gas เพิ่ม (การจำกัด gas ที่ส่งต่อเป็นทางเลือกที่ต้องชั่งกับกระเป๋าแบบ contract wallet) ควรประเมินก่อนขึ้น production
- `reason` ของ dispute และของ `requestRevision` อยู่ใน event บน chain ถาวร อ่านได้ทุกคน ห้ามใส่ข้อมูลส่วนตัวหรือความลับ ให้ UI เตือนผู้ใช้
- owner เปลี่ยน `feeBps`, `arbiter`, `feeRecipient` ได้ทันที (มี event แจ้งแล้ว) ควรเฝ้าดู event เหล่านี้ และก่อน production ควรใช้ `Ownable2Step` กันโอนสิทธิ์ผิด address และให้ owner เป็น multisig
- Contract ไม่รู้ราคาบาท/ดอลลาร์ ค่าจ้างเป็น ETH ล้วน ราคา ETH ที่ผันผวนมีผลต่อมูลค่าจริงของค่าจ้าง (บน testnet ไม่เป็นปัญหา)
- Backend/Frontend ต้องไม่เชื่อ `amount`, `role` ที่ส่งมาจาก client โดยไม่ตรวจซ้ำ ใช้ค่าจาก chain/DB เป็นหลัก
- ห้าม commit `.env` หรือ private key และใช้ wallet แยกสำหรับ deploy
- ก่อนขึ้น mainnet: เพิ่ม fuzz/invariant test, ใช้ Slither หรือ Foundry fuzz, และให้ผู้เชี่ยวชาญ audit
- ประเด็นกฎหมายและภาษี (ข้อตกลงการใช้งานที่ระบุอำนาจของ arbiter, กฎหมายสินทรัพย์ดิจิทัล) อยู่นอกขอบเขตของโค้ดนี้ ควรปรึกษาผู้เชี่ยวชาญก่อนใช้กับเงินจริง
