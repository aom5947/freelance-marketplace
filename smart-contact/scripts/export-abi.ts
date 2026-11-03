// ส่งออก ABI สำหรับทีม Frontend → abi/FreelinkEscrow.abi.json
// รัน: npx hardhat build && npx hardhat run scripts/export-abi.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";

const artifact = JSON.parse(
  await readFile(
    "artifacts/contracts/FreelinkEscrow.sol/FreelinkEscrow.json",
    "utf8",
  ),
);

await mkdir("abi", { recursive: true });
await writeFile(
  "abi/FreelinkEscrow.abi.json",
  JSON.stringify(artifact.abi, null, 2) + "\n",
);
console.log("exported abi/FreelinkEscrow.abi.json");
