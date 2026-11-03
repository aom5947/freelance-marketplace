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
