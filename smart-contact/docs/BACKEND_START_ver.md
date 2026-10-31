# Backend Starter — Solidity Escrow (Freelink)

เอกสารนี้อิงจาก `INTEGRATION.md` หัวข้อ 1 (Smart Contract) และหัวข้อ 8 (Blockchain / Escrow)
ครอบคลุมเฉพาะส่วน **Smart Contract** ที่เป็นงานของคุณ ส่วน REST API (`/jobs`, `/auth/me` ฯลฯ) เป็นงานของคนที่ทำ Backend/DB

> ⚠️ ชื่อฟังก์ชัน, event, สถานะ และพารามิเตอร์ด้านล่างเป็นข้อเสนอที่สอดคล้องกับ placeholder ใน INTEGRATION.md
> ยังไม่ได้ตกลงกับทีม ต้องยืนยันก่อน deploy จริง (ดูหัวข้อ 9)
> โค้ดเป็นจุดเริ่มต้นสำหรับ demo/testnet ยังไม่ผ่านการ audit ห้ามใช้กับเงินจริง

---

## 1. สิ่งที่ต้องเลือก (ตัดสินใจก่อนเริ่ม)

| เรื่อง | ตัวเลือกในเอกสารนี้ | เหตุผล |
| --- | --- | --- |
| ภาษา | Solidity `^0.8.24` | เวอร์ชันใหม่มี overflow check ในตัว |
| สกุลเงิน | **ERC-20** (เช่น USDC บน testnet) | ราคาคงที่ เหมาะกับค่าจ้าง ต้อง `approve` ก่อน `depositEscrow` (ตรงกับข้อที่ต้องยืนยันใน INTEGRATION.md) |
| Library | OpenZeppelin v5 | `SafeERC20`, `ReentrancyGuard`, `Ownable` |
| เครื่องมือเริ่มต้น | **Remix IDE** | เขียน/compile/deploy ในเบราว์เซอร์ ไม่ต้องติดตั้ง |
| เครื่องมือเมื่อโตขึ้น | **Hardhat v2** | test อัตโนมัติ, deploy script, export ABI |
| Network สำหรับ demo | Sepolia | testnet หลักของ Ethereum |
| Wallet | MetaMask | Frontend ใช้ `window.ethereum` อยู่แล้ว |

ถ้าต้องการใช้ ETH แทน ERC-20 ให้เปลี่ยนเป็น `payable` และใช้ `call{value: ...}` แทน `safeTransfer` (ไม่ต้อง approve)

---

## 2. โครงสร้างโปรเจกต์ (Hardhat)

```
freelink-contracts/
├─ contracts/
│  ├─ FreelinkEscrow.sol
│  └─ mocks/
│     └─ MockUSDC.sol          # ใช้ทดสอบเท่านั้น
├─ scripts/
│  └─ deploy.js
├─ test/
│  └─ FreelinkEscrow.test.js
├─ hardhat.config.js
├─ .env                        # ห้าม commit
├─ .env.example
├─ .gitignore
└─ package.json
```

### ติดตั้ง

```bash
mkdir freelink-contracts && cd freelink-contracts
npm init -y
npm install --save-dev hardhat@^2 @nomicfoundation/hardhat-toolbox@^5 dotenv
npm install @openzeppelin/contracts@^5
npx hardhat init        # เลือก "Create an empty hardhat.config.js"
mkdir -p contracts/mocks scripts test
```

### `.env.example`

```env
SEPOLIA_RPC_URL=
DEPLOYER_PRIVATE_KEY=
ETHERSCAN_API_KEY=
TOKEN_ADDRESS=
ARBITER_ADDRESS=
FEE_RECIPIENT_ADDRESS=
FEE_BPS=250
```

### `.gitignore`

```
node_modules
.env
artifacts
cache
coverage
```

> ใช้ wallet ใหม่สำหรับ testnet โดยเฉพาะ ห้ามใช้ private key ของ wallet ที่มีเงินจริง

### `hardhat.config.js`

```js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
};
```

---

## 3. ออกแบบ Escrow ให้ตรงกับ Frontend

### 3.1 สถานะ on-chain → UI

| On-chain `Status` | `escrowStatus` ใน UI | หมายเหตุ |
| --- | --- | --- |
| `Unfunded` (0) | `unfunded` | ยังไม่มีการฝาก (ค่าเริ่มต้นของ mapping) |
| `Funded` (1) | `funded` | ฝากแล้ว รอส่งงาน/ตรวจรับ |
| `Released` (2) | `released` | จ่ายให้ freelancer แล้ว |
| `Refunded` (3) | `refunded` | คืนให้ client แล้ว |
| `Disputed` (4) | `funded` + project status `disputed` | เงินยังอยู่ใน contract รอ arbiter |

### 3.2 ใครเรียกอะไรได้

| ฟังก์ชัน | ผู้เรียก | เงื่อนไข |
| --- | --- | --- |
| `depositEscrow` | client | ยังไม่เคยมี escrow ของ `projectId` นี้ |
| `submitWork` | freelancer | สถานะ `Funded` |
| `releasePayment` | client | สถานะ `Funded` |
| `refundClient` | freelancer (ได้ทุกเมื่อ) หรือ client (หลัง deadline และยังไม่ส่งงาน) | สถานะ `Funded` |
| `openDispute` | client หรือ freelancer | สถานะ `Funded` |
| `resolveDispute` | arbiter (ผู้ดูแลแพลตฟอร์ม) | สถานะ `Disputed` |
| `setFeeBps` / `setArbiter` / `setFeeRecipient` | owner | `feeBps` ไม่เกิน 10% |

### 3.3 Event → UI

| Event | Frontend ควรทำอะไร |
| --- | --- |
| `EscrowFunded` | project `escrowStatus = funded`, transaction ฝากเงิน `confirmed` |
| `WorkSubmitted` | แจ้งเตือน client ว่ามีงานรอตรวจ (project เป็น `in_review`) |
| `PaymentReleased` | project `completed`, `escrowStatus = released` |
| `EscrowRefunded` | `escrowStatus = refunded` |
| `DisputeOpened` | project `disputed` |
| `DisputeResolved` | ตามผลที่ได้ จะมี `PaymentReleased` หรือ `EscrowRefunded` ตามมาด้วย |

### 3.4 รหัสโปรเจกต์

Backend น่าจะใช้ id แบบ string/UUID แต่ contract ใช้ `bytes32` ประหยัดกว่า
ให้ทุกฝั่งแปลงด้วยวิธีเดียวกัน: `projectId = keccak256(toUtf8Bytes(project.id))`

```js
// ethers v6
const projectIdBytes32 = ethers.id(project.id);
```

---

## 4. โค้ด Contract

### `contracts/FreelinkEscrow.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FreelinkEscrow
/// @notice Escrow สำหรับค่าจ้างงาน Freelance (ERC-20) — เวอร์ชัน demo ยังไม่ผ่าน audit
contract FreelinkEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- Types ----------
    enum Status {
        Unfunded, // 0: ยังไม่มี escrow (ค่าเริ่มต้น)
        Funded,   // 1
        Released, // 2
        Refunded, // 3
        Disputed  // 4
    }

    struct Escrow {
        address client;
        address freelancer;
        uint256 amount;
        uint64 deadline;
        bool workSubmitted;
        Status status;
    }

    // ---------- State ----------
    IERC20 public immutable token;
    address public arbiter;
    address public feeRecipient;
    uint16 public feeBps; // 250 = 2.5%
    uint16 public constant MAX_FEE_BPS = 1000; // 10%

    mapping(bytes32 => Escrow) private escrows;

    // ---------- Errors ----------
    error NotAuthorized();
    error InvalidStatus();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidDeadline();
    error AlreadyExists();
    error NotYetRefundable();
    error FeeTooHigh();

    // ---------- Events ----------
    event EscrowFunded(
        bytes32 indexed projectId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        uint64 deadline
    );
    event WorkSubmitted(bytes32 indexed projectId, address indexed freelancer, bytes32 workHash);
    event PaymentReleased(
        bytes32 indexed projectId,
        address indexed freelancer,
        uint256 amountToFreelancer,
        uint256 fee
    );
    event EscrowRefunded(bytes32 indexed projectId, address indexed client, uint256 amount);
    event DisputeOpened(bytes32 indexed projectId, address indexed openedBy);
    event DisputeResolved(bytes32 indexed projectId, bool toFreelancer);

    constructor(
        address token_,
        address arbiter_,
        address feeRecipient_,
        uint16 feeBps_
    ) Ownable(msg.sender) {
        if (token_ == address(0) || arbiter_ == address(0) || feeRecipient_ == address(0)) {
            revert InvalidAddress();
        }
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        token = IERC20(token_);
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    // ---------- Client ----------

    /// @notice ฝากเงินเข้า escrow (client ต้อง approve token ให้ contract นี้ก่อน)
    function depositEscrow(
        bytes32 projectId,
        address freelancer,
        uint256 amount,
        uint64 deadline
    ) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (freelancer == address(0) || freelancer == msg.sender) revert InvalidAddress();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        Escrow storage e = escrows[projectId];
        if (e.client != address(0)) revert AlreadyExists();

        e.client = msg.sender;
        e.freelancer = freelancer;
        e.amount = amount;
        e.deadline = deadline;
        e.status = Status.Funded;

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowFunded(projectId, msg.sender, freelancer, amount, deadline);
    }

    /// @notice client ตรวจรับงานแล้วปล่อยเงินให้ freelancer
    function releasePayment(bytes32 projectId) external nonReentrant {
        Escrow storage e = escrows[projectId];
        if (msg.sender != e.client) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        _payFreelancer(projectId, e);
    }

    // ---------- Freelancer ----------

    /// @notice แจ้งว่าส่งงานแล้ว (workHash = hash ของลิงก์/ไฟล์ที่เก็บ off-chain)
    function submitWork(bytes32 projectId, bytes32 workHash) external {
        Escrow storage e = escrows[projectId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        e.workSubmitted = true;
        emit WorkSubmitted(projectId, msg.sender, workHash);
    }

    // ---------- Refund ----------

    /// @notice คืนเงินให้ client
    ///  - freelancer เรียกได้ทุกเมื่อ (ยอมยกเลิก)
    ///  - client เรียกได้หลัง deadline และ freelancer ยังไม่ส่งงาน
    function refundClient(bytes32 projectId) external nonReentrant {
        Escrow storage e = escrows[projectId];
        if (e.status != Status.Funded) revert InvalidStatus();

        if (msg.sender == e.freelancer) {
            // ok
        } else if (msg.sender == e.client) {
            if (block.timestamp <= e.deadline || e.workSubmitted) revert NotYetRefundable();
        } else {
            revert NotAuthorized();
        }
        _refund(projectId, e);
    }

    // ---------- Dispute ----------

    function openDispute(bytes32 projectId) external {
        Escrow storage e = escrows[projectId];
        if (msg.sender != e.client && msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        e.status = Status.Disputed;
        emit DisputeOpened(projectId, msg.sender);
    }

    function resolveDispute(bytes32 projectId, bool toFreelancer) external nonReentrant {
        if (msg.sender != arbiter) revert NotAuthorized();
        Escrow storage e = escrows[projectId];
        if (e.status != Status.Disputed) revert InvalidStatus();

        emit DisputeResolved(projectId, toFreelancer);
        if (toFreelancer) {
            _payFreelancer(projectId, e);
        } else {
            _refund(projectId, e);
        }
    }

    // ---------- Views ----------

    function getEscrow(bytes32 projectId) external view returns (Escrow memory) {
        return escrows[projectId];
    }

    // ---------- Admin ----------

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = newFeeBps; // มีผลกับ escrow ที่ยังไม่ปล่อยด้วย — ถ้าไม่ต้องการ ให้ snapshot feeBps ตอนฝาก
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidAddress();
        arbiter = newArbiter;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        feeRecipient = newRecipient;
    }

    // ---------- Internal ----------

    function _payFreelancer(bytes32 projectId, Escrow storage e) private {
        e.status = Status.Released; // เปลี่ยนสถานะก่อนโอน (checks-effects-interactions)
        uint256 fee = (e.amount * feeBps) / 10_000;
        uint256 payout = e.amount - fee;

        token.safeTransfer(e.freelancer, payout);
        if (fee > 0) token.safeTransfer(feeRecipient, fee);

        emit PaymentReleased(projectId, e.freelancer, payout, fee);
    }

    function _refund(bytes32 projectId, Escrow storage e) private {
        e.status = Status.Refunded;
        token.safeTransfer(e.client, e.amount);
        emit EscrowRefunded(projectId, e.client, e.amount);
    }
}
```

### `contracts/mocks/MockUSDC.sol` (ใช้ทดสอบเท่านั้น)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

---

## 5. Test

### `test/FreelinkEscrow.test.js`

```js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("FreelinkEscrow", () => {
  async function setup() {
    const [owner, client, freelancer, arbiter, treasury] = await ethers.getSigners();

    const token = await (await ethers.getContractFactory("MockUSDC")).deploy();
    const escrow = await (
      await ethers.getContractFactory("FreelinkEscrow")
    ).deploy(await token.getAddress(), arbiter.address, treasury.address, 250); // 2.5%

    const amount = 1000n * 10n ** 6n; // 1000 USDC (6 decimals)
    await token.mint(client.address, amount);
    await token.connect(client).approve(await escrow.getAddress(), amount);

    const projectId = ethers.id("project-1");
    const deadline = (await time.latest()) + 7 * 24 * 3600;

    return { escrow, token, owner, client, freelancer, arbiter, treasury, amount, projectId, deadline };
  }

  it("ฝาก → ส่งงาน → ปล่อยเงิน (หักค่าธรรมเนียม 2.5%)", async () => {
    const { escrow, token, client, freelancer, treasury, amount, projectId, deadline } = await setup();

    await expect(escrow.connect(client).depositEscrow(projectId, freelancer.address, amount, deadline))
      .to.emit(escrow, "EscrowFunded");
    expect((await escrow.getEscrow(projectId)).status).to.equal(1n); // Funded

    await escrow.connect(freelancer).submitWork(projectId, ethers.id("https://example.com/work"));
    await expect(escrow.connect(client).releasePayment(projectId)).to.emit(escrow, "PaymentReleased");

    expect(await token.balanceOf(freelancer.address)).to.equal(975n * 10n ** 6n);
    expect(await token.balanceOf(treasury.address)).to.equal(25n * 10n ** 6n);
    expect((await escrow.getEscrow(projectId)).status).to.equal(2n); // Released
  });

  it("client ขอคืนเงินได้หลัง deadline ถ้ายังไม่ส่งงาน", async () => {
    const { escrow, token, client, freelancer, amount, projectId, deadline } = await setup();
    await escrow.connect(client).depositEscrow(projectId, freelancer.address, amount, deadline);

    await expect(escrow.connect(client).refundClient(projectId)).to.be.revertedWithCustomError(
      escrow,
      "NotYetRefundable"
    );

    await time.increaseTo(deadline + 1);
    await escrow.connect(client).refundClient(projectId);
    expect(await token.balanceOf(client.address)).to.equal(amount);
  });

  it("คนอื่นปล่อยเงินไม่ได้", async () => {
    const { escrow, client, freelancer, amount, projectId, deadline } = await setup();
    await escrow.connect(client).depositEscrow(projectId, freelancer.address, amount, deadline);

    await expect(escrow.connect(freelancer).releasePayment(projectId)).to.be.revertedWithCustomError(
      escrow,
      "NotAuthorized"
    );
  });

  it("dispute → arbiter ตัดสินให้ freelancer", async () => {
    const { escrow, token, client, freelancer, arbiter, amount, projectId, deadline } = await setup();
    await escrow.connect(client).depositEscrow(projectId, freelancer.address, amount, deadline);

    await escrow.connect(freelancer).openDispute(projectId);
    await escrow.connect(arbiter).resolveDispute(projectId, true);

    expect(await token.balanceOf(freelancer.address)).to.equal(975n * 10n ** 6n);
  });
});
```

รัน:

```bash
npx hardhat compile
npx hardhat test
```

ควรเพิ่มเทสต์: deposit ซ้ำ projectId เดิม, deposit amount = 0, resolveDispute โดยคนที่ไม่ใช่ arbiter, ตั้ง fee เกิน 10%

---

## 6. Deploy

### `scripts/deploy.js`

```js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  let tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    // ไม่ได้ระบุ token → deploy mock สำหรับ demo
    const token = await (await ethers.getContractFactory("MockUSDC")).deploy();
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log("MockUSDC:", tokenAddress);
  }

  const arbiter = process.env.ARBITER_ADDRESS || deployer.address;
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;
  const feeBps = Number(process.env.FEE_BPS || 250);

  const escrow = await (
    await ethers.getContractFactory("FreelinkEscrow")
  ).deploy(tokenAddress, arbiter, feeRecipient, feeBps);
  await escrow.waitForDeployment();

  console.log("FreelinkEscrow:", await escrow.getAddress());
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

```bash
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat verify --network sepolia <ESCROW_ADDRESS> <TOKEN> <ARBITER> <FEE_RECIPIENT> <FEE_BPS>
```

ต้องมี Sepolia ETH สำหรับ gas (ขอจาก faucet)

### ทางลัด: ใช้ Remix IDE

1. เปิด https://remix.ethereum.org สร้างไฟล์ `FreelinkEscrow.sol` และ `MockUSDC.sol` แล้ววางโค้ดข้างบน (Remix ดึง `@openzeppelin/contracts` จาก npm ให้เองตาม import)
2. แท็บ **Solidity Compiler** → เลือก `0.8.24` → Compile
3. แท็บ **Deploy & Run** → Environment: **Injected Provider – MetaMask** (สลับ MetaMask เป็น Sepolia)
4. Deploy `MockUSDC` ก่อน แล้วนำ address ไปใส่ใน constructor ของ `FreelinkEscrow` (พร้อม arbiter, feeRecipient, feeBps)
5. คัดลอก ABI จากแท็บ Compiler (ปุ่ม ABI) และ address จากรายการ Deployed Contracts

---

## 7. ส่งมอบให้ Frontend

### 7.1 ABI

หลัง compile ที่ Hardhat: `artifacts/contracts/FreelinkEscrow.sol/FreelinkEscrow.json` → ใช้ field `abi`
(ส่งทั้งไฟล์ หรือสกัดเฉพาะ `abi` เป็น `FreelinkEscrow.abi.json`)

### 7.2 ค่าที่ต้องกรอกใน `src/config/contractConfig.js` และ `.env`

```env
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0x...        # address ของ FreelinkEscrow
VITE_EXPLORER_URL=https://sepolia.etherscan.io
```

```js
// src/config/contractConfig.js (ตัวอย่างค่าที่ต้องเติม)
chainId: 11155111,
chainName: "Sepolia",
contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
abi,                                   // จากข้อ 7.1
currency: { type: "erc20", symbol: "mUSDC", address: "0x...", decimals: 6 },
methods: {
  depositEscrow: "depositEscrow",
  releasePayment: "releasePayment",
  refundClient: "refundClient",
  getEscrow: "getEscrow",
  openDispute: "openDispute",
},
explorerUrl: "https://sepolia.etherscan.io",
```

> ฟังก์ชันที่เพิ่มจาก placeholder เดิม: `submitWork`, `resolveDispute` และ parameter `deadline` ใน `depositEscrow` ต้องแจ้งทีม Frontend เพื่อเพิ่มใน `methods`

### 7.3 ลำดับเรียกจากฝั่ง Frontend (ERC-20)

1. `token.approve(escrowAddress, amount)`
2. `escrow.depositEscrow(projectId, freelancer, amount, deadline)`
3. freelancer: `escrow.submitWork(projectId, workHash)`
4. client: `escrow.releasePayment(projectId)` หรือฝ่ายใดฝ่ายหนึ่ง `openDispute`

ปริมาณเงินต้องแปลงตาม decimals: `ethers.parseUnits("100", 6)`

### 7.4 Error case ที่ UI ต้องรองรับ (จาก INTEGRATION.md หัวข้อ 8)

| กรณี | เกิดที่ไหน | วิธีตรวจ |
| --- | --- | --- |
| User rejected request | Wallet | ethers error `ACTION_REJECTED` / MetaMask code `4001` |
| Wrong network | Frontend | เทียบ `chainId` ของ wallet กับ `VITE_CHAIN_ID` ก่อนส่ง tx (contract ป้องกันให้ไม่ได้) |
| Insufficient funds | Wallet/RPC | error `INSUFFICIENT_FUNDS` (gas ไม่พอ) หรือ `ERC20InsufficientBalance` (token ไม่พอ) |
| Contract execution reverted | Contract | ถอดรหัส custom error ด้วย ABI: `NotAuthorized`, `InvalidStatus`, `AlreadyExists`, `NotYetRefundable` ฯลฯ → แสดงข้อความภาษาไทยที่เข้าใจได้ |

---

## 8. (ถ้าจำเป็น) ฟัง Event ฝั่ง Backend

Backend/DB อาจต้องรู้ว่า on-chain เกิดอะไรขึ้นเพื่อสร้าง Notification และอัปเดตสถานะ (ข้อ "Notification เกิดจาก event จริง" ใน checklist)
ตัวอย่างพื้นฐานด้วย ethers v6 (ทีม Backend เป็นผู้ implement จริง):

```js
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const escrow = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

escrow.on("PaymentReleased", (projectId, freelancer, payout, fee, event) => {
  // 1) หา project จาก projectId (เก็บ mapping keccak256(id) → id ใน DB)
  // 2) อัปเดต status = completed, escrowStatus = released
  // 3) บันทึก txHash = event.log.transactionHash
});
```

ข้อควรระวัง: ควรรอ confirmation หลายบล็อกก่อนถือว่าสำเร็จ และเก็บ block number ล่าสุดที่ประมวลผล เพื่อดึง event ที่พลาดไปตอนเซิร์ฟเวอร์ล่ม

---

## 9. สิ่งที่ต้องตกลงกับทีมก่อน deploy จริง

- [ ] ใช้ ERC-20 ตัวไหน (หรือเปลี่ยนเป็น ETH) + decimals
- [ ] ชื่อฟังก์ชัน/พารามิเตอร์/event สุดท้าย (โดยเฉพาะ `deadline`, `submitWork`, `resolveDispute` ที่เพิ่มเข้ามา)
- [ ] ใครเป็น arbiter (wallet เดียว หรือ multisig) และขั้นตอนตัดสิน dispute
- [ ] ค่าธรรมเนียม (`feeBps`) และ address ผู้รับ
- [ ] ระบบมีงานหลาย milestone หรือไม่ (ตอนนี้ contract รองรับการจ่ายก้อนเดียวต่อโปรเจกต์)
- [ ] ถ้า client หายไปหลังส่งงาน freelancer จะทำอย่างไร (ตอนนี้ต้อง `openDispute` ให้ arbiter ตัดสิน ยังไม่มี auto-release)
- [ ] Testnet ที่ใช้ demo และ RPC URL สาธารณะ
- [ ] วิธีเก็บ mapping `projectId` (string) ↔ `bytes32`

---

## 10. หมายเหตุด้านความปลอดภัย

- Contract นี้ยังไม่ผ่าน audit ใช้ได้เฉพาะ testnet/demo
- ไม่รองรับ token แบบ fee-on-transfer หรือ rebasing (จำนวนที่ได้รับจะไม่ตรงกับ `amount`)
- arbiter มีอำนาจตัดสินเงินในข้อพิพาท จึงควรเป็น multisig ถ้าขึ้น production
- Backend/Frontend ต้องไม่เชื่อ `amount`, `role` ที่ส่งมาจาก client โดยไม่ตรวจซ้ำ ใช้ค่าจาก chain/DB เป็นหลัก
- ห้าม commit `.env` หรือ private key และใช้ wallet แยกสำหรับ deploy
- ก่อนขึ้น mainnet: เขียนเทสต์ครอบคลุม, ใช้ Slither/Foundry fuzz, และให้ผู้เชี่ยวชาญ audit
