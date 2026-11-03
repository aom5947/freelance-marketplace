// Smoke test: เดินกระบวนการจริงกับ FreelinkEscrow ที่ deploy แล้ว (ใช้ ETH จริงบน testnet ยอดจิ๋ว)
//   Sepolia:  ESCROW_ADDRESS=0x... npx hardhat run scripts/smoke-sepolia.ts --network sepolia
//   ในเครื่อง (ซ้อมสคริปต์ก่อน): npx hardhat run scripts/smoke-sepolia.ts   (ไม่ตั้ง ESCROW_ADDRESS จะ deploy ใหม่ให้)
//
// สิ่งที่ทำ:
//   - สร้างกระเป๋าชั่วคราว client / freelancer แล้วโอน ETH จาก deployer ไปให้ (จบแล้วโอนส่วนที่เหลือกลับ)
//   - A) ฝาก → รับงาน → ส่งงาน → ปล่อยเงิน
//   - B) ฝาก → รับงาน → ส่งงาน → ขอแก้ → ส่งใหม่ → ปล่อยเงิน (+ เช็กว่า client ขอคืนเงินเองไม่ได้หลังเคยส่งงาน)
//   - C) ฝาก → รับงาน → ส่งงาน → เปิดข้อพิพาท → arbiter ตัดสิน 70/30 (ต้องใช้ deployer เป็น arbiter)
// ไม่ทดสอบเส้นทางที่ต้องรอเวลา (reviewPeriod / arbiterTimeout / deadline หมด) — ส่วนนั้นพึ่ง unit test
import { network } from "hardhat";
import {
  createWalletClient,
  custom,
  formatEther,
  getAddress,
  keccak256,
  parseEther,
  toHex,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

try {
  process.loadEnvFile(".env");
} catch {
  // ไม่มี .env ก็ใช้ค่าเริ่มต้น
}

const Status = { Funded: 1, Active: 2, Submitted: 3, Disputed: 4, Released: 5, Refunded: 6, Resolved: 7 } as const;

const AMOUNT = parseEther(process.env.SMOKE_AMOUNT_ETH || "0.0001"); // ค่าจ้างต่อ escrow
const FUND = parseEther(process.env.SMOKE_FUND_ETH || "0.005"); // ทุนให้กระเป๋าชั่วคราวแต่ละใบ (ค่าแก๊ส + ค่าจ้าง)

const { viem, networkName, provider } = await network.create();
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();
const chainId = await publicClient.getChainId();

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? "✔" : "✘"} ${msg}`);
  if (!ok) failures++;
};
const link = (hash: Hex) => (chainId === 11155111 ? `https://sepolia.etherscan.io/tx/${hash}` : hash);

// ---------- เตรียม contract ----------
let escrowAddress = process.env.ESCROW_ADDRESS as `0x${string}` | undefined;
if (!escrowAddress) {
  if (networkName === "sepolia") {
    throw new Error("ตั้ง ESCROW_ADDRESS เป็น address ที่ deploy ไว้บน Sepolia (ใส่ใน .env หรือ environment variable)");
  }
  const fresh = await viem.deployContract("FreelinkEscrow", [
    deployer.account.address,
    deployer.account.address,
    500,
    7n * 24n * 3600n,
    14n * 24n * 3600n,
    7n * 24n * 3600n,
    2,
  ]);
  escrowAddress = fresh.address;
  console.log("(ซ้อมในเครื่อง) deploy contract ใหม่:", escrowAddress);
}
escrowAddress = getAddress(escrowAddress);

const code = await publicClient.getCode({ address: escrowAddress });
if (!code || code === "0x") throw new Error(`ไม่พบ contract ที่ ${escrowAddress} บน chain ${chainId}`);

const read = await viem.getContractAt("FreelinkEscrow", escrowAddress);
const [arbiter, feeBps, revisionPeriod, maxRevisions] = await Promise.all([
  read.read.arbiter(),
  read.read.feeBps(),
  read.read.revisionPeriod(),
  read.read.maxRevisions(),
]);
console.log(`Network ${networkName} (chain ${chainId})`);
console.log(`Contract ${escrowAddress}`);
console.log(`Deployer ${deployer.account.address}  ยอด ${formatEther(await publicClient.getBalance({ address: deployer.account.address }))} ETH`);
console.log(`arbiter ${arbiter} | feeBps ${feeBps} | revisionPeriod ${revisionPeriod}s | maxRevisions ${maxRevisions}\n`);

// ---------- กระเป๋าชั่วคราว ----------
const makeWallet = (label: string) => {
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: publicClient.chain, transport: custom(provider) });
  const contract = viem.getContractAt("FreelinkEscrow", escrowAddress!, { client: { public: publicClient, wallet } });
  return { label, key, account, wallet, contract };
};
const client = makeWallet("client");
const freelancer = makeWallet("freelancer");
const clientC = await client.contract;
const freelancerC = await freelancer.contract;
const arbiterC = getAddress(arbiter) === getAddress(deployer.account.address) ? await viem.getContractAt("FreelinkEscrow", escrowAddress) : undefined;

// RPC สาธารณะมักกระจายคำขอไปหลาย node ที่ซิงก์ไม่พร้อมกัน → อ่านค่าทันทีหลัง receipt อาจได้ state เก่า
// จึงจำ block ล่าสุดที่ธุรกรรมเข้า แล้วอ่านทุกค่า ณ block นั้น (ถ้า node ยังไม่มี block นี้ให้ลองใหม่)
let head = 0n;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const atHead = async <T>(fn: (blockNumber: bigint) => Promise<T>): Promise<T> => {
  for (let i = 0; ; i++) {
    try {
      return await fn(head);
    } catch (e) {
      if (i >= 20) throw e;
      await sleep(1000);
    }
  }
};

const wait = async (hash: Hex, what: string) => {
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${what} ล้มเหลว: ${link(hash)}`);
  if (r.blockNumber > head) head = r.blockNumber;
  console.log(`  · ${what}  ${link(hash)}`);
  return r;
};
const errText = (e: unknown) => {
  const x = e as { shortMessage?: string; details?: string; cause?: { message?: string } };
  return [x.shortMessage ?? String(e), x.details, x.cause?.message].filter(Boolean).join(" | ");
};

// ส่งธุรกรรมแล้วรอ receipt — ถ้า RPC สาธารณะตอบ error ชั่วคราวตอนส่ง (ก่อนมี tx hash) ลองส่งใหม่ได้ ไม่เสียอะไร
// ถ้ารอบแรกถูก broadcast ไปแล้วจริง รอบสองจะชน nonce/สถานะเดิมและ error เอง (ไม่ส่งซ้ำสองครั้ง)
const send = async (submit: () => Promise<Hex>, what: string) => {
  for (let i = 0; ; i++) {
    let hash: Hex;
    try {
      hash = await submit();
    } catch (e) {
      if (i >= 3) throw e;
      console.log(`  ! ${what}: ส่งไม่สำเร็จ (${errText(e)}) — ลองใหม่ครั้งที่ ${i + 1}`);
      await sleep(2000 * (i + 1));
      continue;
    }
    return wait(hash, what);
  }
};

const balance = (address: `0x${string}`) => atHead((blockNumber) => publicClient.getBalance({ address, blockNumber }));

const expectRevert = async (fn: (blockNumber: bigint) => Promise<unknown>, errorName: string, what: string) => {
  let last: unknown;
  for (let i = 0; i < 10; i++) {
    try {
      await fn(head);
      check(false, `${what}: ควร revert ${errorName} แต่ผ่าน`);
      return;
    } catch (e) {
      // ชื่อ error อยู่ใน message เต็ม ไม่ได้อยู่ใน shortMessage
      if (String(e).includes(`${errorName}()`)) {
        check(true, `${what}: revert ${errorName}`);
        return;
      }
      last = e; // อาจเป็น node ที่ยังไม่มี block นี้ ลองใหม่
      await sleep(1000);
    }
  }
  check(false, `${what}: ควร revert ${errorName} แต่ได้ ${(last as { shortMessage?: string })?.shortMessage ?? last}`);
};

const unique = `${Date.now()}-${Math.random()}`;
const newTerms = (label: string) => keccak256(toHex(`terms-${label}-${unique}`));
const newProject = (label: string) => keccak256(toHex(`project-${label}-${unique}`));

const getEscrow = (id: Hex) => atHead((blockNumber) => read.read.getEscrow([id], { blockNumber }));

// สร้าง escrow ที่ฝากแล้ว+freelancer รับงานแล้ว+ส่งงานแล้ว คืนค่า escrowId
async function toSubmitted(label: string) {
  const projectId = newProject(label);
  const termsHash = newTerms(label);
  const block = await publicClient.getBlock();
  const deadline = block.timestamp + 3n * 24n * 3600n;
  const [, total] = await read.read.quote([AMOUNT]);
  const id = await read.read.computeEscrowId([client.account.address, projectId]);

  await send(
    () => clientC.write.depositEscrow([projectId, freelancer.account.address, deadline, termsHash, AMOUNT], { value: total }),
    "client ฝากเงิน",
  );
  check((await getEscrow(id)).status === Status.Funded, "สถานะ Funded");
  await send(() => freelancerC.write.acceptEscrow([id, termsHash]), "freelancer รับงาน");
  check((await getEscrow(id)).status === Status.Active, "สถานะ Active");
  await send(() => freelancerC.write.submitWork([id, keccak256(toHex(`work-1-${label}-${unique}`))]), "freelancer ส่งงาน");
  check((await getEscrow(id)).status === Status.Submitted, "สถานะ Submitted");
  return { id, total };
}

try {
  // ---------- ให้ทุนกระเป๋าชั่วคราว ----------
  console.log("== เตรียมกระเป๋า ==");
  console.log(`client     ${client.account.address}\nfreelancer ${freelancer.account.address}`);
  for (const w of [client, freelancer]) {
    await send(() => deployer.sendTransaction({ to: w.account.address, value: FUND }), `โอน ${formatEther(FUND)} ETH ให้ ${w.label}`);
  }

  // ---------- A) เส้นทางปกติ ----------
  console.log("\n== A) ส่งงาน → ปล่อยเงิน ==");
  {
    const { id, total } = await toSubmitted("A");
    const before = await balance(freelancer.account.address);
    const contractBefore = await balance(escrowAddress);
    await send(() => clientC.write.releasePayment([id]), "client ปล่อยเงิน");
    const after = await balance(freelancer.account.address);
    const e = await getEscrow(id);
    check(e.status === Status.Released, "สถานะ Released");
    check(after - before === AMOUNT, `freelancer ได้รับค่าจ้างเต็ม ${formatEther(AMOUNT)} ETH`);
    check(contractBefore - (await balance(escrowAddress)) === total, "เงินออกจาก contract ครบ (ค่าจ้าง + ค่าธรรมเนียม)");
  }

  // ---------- B) ขอแก้งาน ----------
  console.log("\n== B) ขอแก้งาน ==");
  if (maxRevisions === 0) {
    console.log("  (ข้าม: contract นี้ตั้ง maxRevisions = 0)");
  } else {
    const { id } = await toSubmitted("B");
    const r = await send(() => clientC.write.requestRevision([id, "smoke test: ขอแก้ไข"]), "client ขอแก้งาน");
    const block = await atHead(() => publicClient.getBlock({ blockNumber: r.blockNumber }));
    const e = await getEscrow(id);
    check(e.status === Status.Active, "สถานะกลับเป็น Active");
    check(e.revisionCount === 1, "revisionCount = 1");
    check(e.deadline >= block.timestamp + revisionPeriod, "deadline ถูกขยายอย่างน้อย revisionPeriod");
    await expectRevert(
      (blockNumber) => clientC.simulate.refundClient([id], { account: client.account, blockNumber }),
      "DisputeRequired",
      "client ขอเงินคืนเองหลังเคยส่งงาน",
    );
    await send(() => freelancerC.write.submitWork([id, keccak256(toHex(`work-2-B-${unique}`))]), "freelancer ส่งงานรอบแก้");
    check((await getEscrow(id)).status === Status.Submitted, "สถานะ Submitted อีกครั้ง");
    await send(() => clientC.write.releasePayment([id]), "client ปล่อยเงิน");
    check((await getEscrow(id)).status === Status.Released, "สถานะ Released");
  }

  // ---------- C) ข้อพิพาท ----------
  console.log("\n== C) ข้อพิพาท → arbiter ตัดสิน 70/30 ==");
  if (!arbiterC) {
    console.log(`  (ข้าม: arbiter คือ ${arbiter} ซึ่งไม่ใช่ deployer จึงเซ็นแทนไม่ได้)`);
  } else {
    const { id } = await toSubmitted("C");
    await send(() => clientC.write.openDispute([id, "smoke test: ไม่พอใจงาน"]), "client เปิดข้อพิพาท");
    check((await getEscrow(id)).status === Status.Disputed, "สถานะ Disputed");
    const fBefore = await balance(freelancer.account.address);
    const cBefore = await balance(client.account.address);
    await send(() => arbiterC.write.resolveDispute([id, 7000]), "arbiter ตัดสิน 70%");
    const e = await getEscrow(id);
    const toFreelancer = (AMOUNT * 7000n) / 10000n;
    check(e.status === Status.Resolved && e.payoutBps === 7000, "สถานะ Resolved, payoutBps = 7000");
    check((await balance(freelancer.account.address)) - fBefore === toFreelancer, `freelancer ได้ ${formatEther(toFreelancer)} ETH`);
    const clientGot = (await balance(client.account.address)) - cBefore;
    check(clientGot === e.amount + e.fee - toFreelancer - (e.fee * 7000n) / 10000n, "client ได้ส่วนที่เหลือคืนครบ");
  }
} catch (e) {
  failures++;
  console.error("\n✘ สคริปต์หยุดกลางทาง:", errText(e));
} finally {
  // โอน ETH ที่เหลือในกระเป๋าชั่วคราวกลับ deployer (best effort)
  console.log("\n== โอนส่วนที่เหลือกลับ deployer ==");
  for (const w of [client, freelancer]) {
    try {
      const bal = await balance(w.account.address);
      if (bal === 0n) {
        console.log(`  ${w.label}: ไม่มียอดเหลือ ไม่ต้องโอนกลับ`);
        continue;
      }
      const fees = await publicClient.estimateFeesPerGas();
      // ไม่ fix gas = 21000: ถ้าผู้รับเป็นบัญชีที่ผูก smart account (EIP-7702) การรับ ETH ต้องรันโค้ดและใช้แก๊สเกิน 21000
      const gas = ((await publicClient.estimateGas({ account: w.account, to: deployer.account.address, value: 1n })) * 3n) / 2n;
      const cost = gas * fees.maxFeePerGas;
      if (bal <= cost) {
        console.log(`  ${w.label}: เหลือน้อยเกินกว่าจะโอนกลับ (${formatEther(bal)} ETH)`);
        continue;
      }
      const hash = await w.wallet.sendTransaction({
        to: deployer.account.address,
        value: bal - cost,
        gas,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      await wait(hash, `${w.label} โอนกลับ ${formatEther(bal - cost)} ETH`);
    } catch (err) {
      console.log(`  ${w.label}: โอนกลับไม่สำเร็จ (${(err as { shortMessage?: string }).shortMessage ?? err})`);
      // key ของกระเป๋าชั่วคราวไม่ได้ถูกเก็บที่ไหน — พิมพ์ไว้ให้กู้ ETH ที่ค้างได้ (ใช้กับ testnet นี้เท่านั้น ห้ามใช้ซ้ำ)
      console.log(`  ${w.label} address ${w.account.address}  (testnet-only key: ${w.key})`);
    }
  }
}

console.log(failures === 0 ? "\nผ่านทั้งหมด" : `\nไม่ผ่าน ${failures} รายการ`);
process.exitCode = failures === 0 ? 0 : 1;
