// ส่งออก ABI สำหรับทีม Frontend → abi/FreelinkEscrow.abi.json (และ MockUSDC)
// รัน: npx hardhat build && npx hardhat run scripts/export-abi.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";

const targets = [
  ["FreelinkEscrow", "contracts/FreelinkEscrow.sol"],
  ["MockUSDC", "contracts/mocks/MockUSDC.sol"],
] as const;

await mkdir("abi", { recursive: true });

for (const [name, source] of targets) {
  const artifact = JSON.parse(
    await readFile(`artifacts/${source}/${name}.json`, "utf8"),
  );
  await writeFile(
    `abi/${name}.abi.json`,
    JSON.stringify(artifact.abi, null, 2) + "\n",
  );
  console.log(`exported abi/${name}.abi.json`);
}
