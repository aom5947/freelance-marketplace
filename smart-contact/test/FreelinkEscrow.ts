import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import {
  type Abi,
  type Address,
  type Hash,
  type Hex,
  encodeAbiParameters,
  getAddress,
  keccak256,
  parseAbiParameters,
  parseEther,
  parseEventLogs,
  stringToHex,
  zeroAddress,
  zeroHash,
} from "viem";

// เหมือน ethers.id(str) — ใช้แปลง project.id (string) → bytes32 ให้ตรงกันทุกฝั่ง
const idOf = (s: string) => keccak256(stringToHex(s));

const DAY = 24n * 3600n;
const FEE_BPS = 500; // 5%
const REVIEW = 7n * DAY; // ช่วงตรวจรับหลังส่งงาน
const ARBITER_TIMEOUT = 14n * DAY; // เวลาที่ arbiter มีเพื่อตัดสิน
const REVISION_PERIOD = 7n * DAY; // เวลาขั้นต่ำที่ freelancer มีส่งงานแก้
const MAX_REVISIONS = 2; // client ขอแก้ได้ 2 ครั้งต่อ escrow (ส่งงานได้สูงสุด 3 รอบ)
const WAGE = parseEther("1"); // ค่าจ้าง 1 ETH
const FEE = parseEther("0.05"); // ค่าธรรมเนียม 5%
const TOTAL = WAGE + FEE; // client จ่ายรวม 1.05 ETH

// ลำดับตรงกับ enum Status ใน contract
const Status = {
  Unfunded: 0,
  Funded: 1,
  Active: 2,
  Submitted: 3,
  Disputed: 4,
  Released: 5,
  Refunded: 6,
  Resolved: 7,
} as const;

describe("FreelinkEscrow v2 (native ETH)", async function () {
  const { viem, networkHelpers } = await network.create();
  const { time } = networkHelpers;
  const publicClient = await viem.getPublicClient();
  const [owner, client, freelancer, arbiter, treasury, stranger] =
    await viem.getWalletClients();

  type Wallet = typeof owner;
  const as = (w: Wallet) => ({ account: w.account });

  // ---------- fixtures ----------

  async function setup() {
    const escrow = await viem.deployContract("FreelinkEscrow", [
      arbiter.account.address,
      treasury.account.address,
      FEE_BPS,
      REVIEW,
      ARBITER_TIMEOUT,
      REVISION_PERIOD,
      MAX_REVISIONS,
    ]);
    const projectId = idOf("project-1");
    const termsHash = idOf("terms-v1");
    const deadline = BigInt(await time.latest()) + 7n * DAY;
    const escrowId = await escrow.read.computeEscrowId([
      client.account.address,
      projectId,
    ]);
    return { escrow, projectId, termsHash, deadline, escrowId };
  }
  type Ctx = Awaited<ReturnType<typeof setup>>;

  async function funded() {
    const c = await setup();
    await dep(c);
    return c;
  }

  async function active() {
    const c = await funded();
    await c.escrow.write.acceptEscrow([c.escrowId, c.termsHash], as(freelancer));
    return c;
  }

  async function submitted() {
    const c = await active();
    await c.escrow.write.submitWork(
      [c.escrowId, idOf("https://example.com/work")],
      as(freelancer),
    );
    return c;
  }

  async function disputed() {
    const c = await active();
    await c.escrow.write.openDispute(
      [c.escrowId, "งานไม่ตรงตามตกลง"],
      as(client),
    );
    return c;
  }

  // ---------- helpers ----------

  /** ฝากเงิน — ค่าเริ่มต้นคือ client ฝากค่าจ้าง 1 ETH + ค่าธรรมเนียม 5% ให้ freelancer */
  function dep(
    c: Pick<Ctx, "escrow" | "projectId" | "termsHash" | "deadline">,
    o: {
      from?: Wallet;
      to?: Address;
      projectId?: Hex;
      deadline?: bigint;
      termsHash?: Hex;
      amount?: bigint;
      value?: bigint;
    } = {},
  ) {
    const amount = o.amount ?? WAGE;
    return c.escrow.write.depositEscrow(
      [
        o.projectId ?? c.projectId,
        o.to ?? freelancer.account.address,
        o.deadline ?? c.deadline,
        o.termsHash ?? c.termsHash,
        amount,
      ],
      {
        account: (o.from ?? client).account,
        value: o.value ?? amount + (amount * BigInt(FEE_BPS)) / 10_000n,
      },
    );
  }

  const statusOf = async (c: Ctx, id: Hex = c.escrowId) =>
    (await c.escrow.read.getEscrow([id])).status;

  const balanceOf = (a: Address) => publicClient.getBalance({ address: a });

  /**
   * ส่ง transaction แล้วคืน receipt + การเปลี่ยนแปลงยอด ETH ของแต่ละ address (ไม่รวมค่า gas ของผู้ส่ง)
   * ใช้เมื่อต้องตรวจทั้ง event และยอดเงินจาก transaction เดียวกัน
   */
  async function exec(send: () => Promise<Hash>, watch: Address[]) {
    const before = await Promise.all(watch.map(balanceOf));
    const hash = await send();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const tx = await publicClient.getTransaction({ hash });
    const gas = receipt.gasUsed * receipt.effectiveGasPrice;
    const after = await Promise.all(watch.map(balanceOf));
    const deltas = watch.map(
      (a, i) =>
        after[i] -
        before[i] +
        (getAddress(a) === getAddress(tx.from) ? gas : 0n),
    );
    return { receipt, deltas };
  }

  /** args ของ event ชื่อ `name` ใน receipt (undefined ถ้าไม่มี) */
  function eventArgs(
    c: { escrow: { abi: unknown } },
    receipt: { logs: readonly unknown[] },
    name: string,
  ) {
    const logs = parseEventLogs({
      abi: c.escrow.abi as Abi,
      logs: receipt.logs as never,
      eventName: name,
    });
    return logs[0]?.args as Record<string, unknown> | undefined;
  }

  const A = (w: Wallet) => getAddress(w.account.address);

  // ===================================================================

  describe("ฝากเงิน (depositEscrow)", () => {
    it("ฝาก → ยอมรับ → ส่งงาน → ปล่อยเงิน (freelancer ได้ 1 ETH, แพลตฟอร์มได้ 0.05 ETH)", async () => {
      const c = await networkHelpers.loadFixture(setup);
      const { escrow, projectId, termsHash, deadline, escrowId } = c;

      await viem.assertions.emitWithArgs(dep(c), escrow, "EscrowFunded", [
        escrowId,
        projectId,
        A(client),
        A(freelancer),
        WAGE,
        FEE,
        deadline,
        termsHash,
      ]);
      assert.equal(await statusOf(c), Status.Funded);
      assert.equal(await balanceOf(escrow.address), TOTAL);

      await viem.assertions.emitWithArgs(
        escrow.write.acceptEscrow([escrowId, termsHash], as(freelancer)),
        escrow,
        "EscrowAccepted",
        [escrowId, A(freelancer)],
      );
      assert.equal(await statusOf(c), Status.Active);

      await viem.assertions.emit(
        escrow.write.submitWork([escrowId, idOf("work")], as(freelancer)),
        escrow,
        "WorkSubmitted",
      );
      assert.equal(await statusOf(c), Status.Submitted);

      const { receipt, deltas } = await exec(
        () => escrow.write.releasePayment([escrowId], as(client)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]);
      assert.deepEqual(eventArgs(c, receipt, "PaymentReleased"), {
        escrowId,
        freelancer: A(freelancer),
        amountToFreelancer: WAGE,
        fee: FEE,
      });

      const e = await escrow.read.getEscrow([escrowId]);
      assert.equal(e.status, Status.Released);
      assert.equal(e.payoutBps, 10000);
      assert.equal(await balanceOf(escrow.address), 0n);
    });

    it("computeEscrowId ตรงกับสูตร keccak256(abi.encode(client, projectId)) ฝั่ง JS", async () => {
      const { projectId, escrowId } = await networkHelpers.loadFixture(setup);
      const expected = keccak256(
        encodeAbiParameters(parseAbiParameters("address, bytes32"), [
          A(client),
          projectId,
        ]),
      );
      assert.equal(escrowId, expected);
    });

    it("quote() ให้ค่าธรรมเนียมและยอดรวมตรงกับที่ต้องแนบ", async () => {
      const { escrow } = await networkHelpers.loadFixture(setup);
      const [fee, total] = await escrow.read.quote([WAGE]);
      assert.equal(fee, FEE);
      assert.equal(total, TOTAL);
    });

    it("แนบ ETH ไม่เท่ากับ amount + fee → revert WrongPayment (ไม่เดาแทน client)", async () => {
      const c = await networkHelpers.loadFixture(setup);
      await viem.assertions.revertWithCustomErrorWithArgs(
        dep(c, { value: WAGE }),
        c.escrow,
        "WrongPayment",
        [TOTAL, WAGE],
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { value: TOTAL + 1n }),
        c.escrow,
        "WrongPayment",
      );
    });

    it("owner ปรับ feeBps ระหว่างที่ client เตรียมธุรกรรม → ธุรกรรมเก่า revert แทนที่จะจ่ายผิดยอด", async () => {
      const c = await networkHelpers.loadFixture(setup);
      await c.escrow.write.setFeeBps([1000], as(owner)); // 10% → ยอดที่ถูกต้องเป็น 1.1 ETH
      await viem.assertions.revertWithCustomErrorWithArgs(
        dep(c, { value: TOTAL }),
        c.escrow,
        "WrongPayment",
        [parseEther("1.1"), TOTAL],
      );
    });

    it("พารามิเตอร์ไม่ถูกต้อง: amount 0 / terms ว่าง / freelancer ผิด / deadline ผิด", async () => {
      const c = await networkHelpers.loadFixture(setup);
      const now = BigInt(await time.latest());

      await viem.assertions.revertWithCustomError(
        dep(c, { amount: 0n, value: 0n }),
        c.escrow,
        "InvalidAmount",
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { termsHash: zeroHash }),
        c.escrow,
        "InvalidTerms",
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { to: zeroAddress }),
        c.escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { to: A(client) }),
        c.escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { deadline: now - 10n }),
        c.escrow,
        "InvalidDeadline",
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { deadline: now + 366n * DAY }),
        c.escrow,
        "InvalidDeadline",
      );
    });

    it("arbiter เป็นคู่กรณีของ escrow เองไม่ได้ (ConflictOfInterest)", async () => {
      const c = await networkHelpers.loadFixture(setup);
      await viem.assertions.revertWithCustomError(
        dep(c, { from: arbiter }),
        c.escrow,
        "ConflictOfInterest",
      );
      await viem.assertions.revertWithCustomError(
        dep(c, { to: A(arbiter) }),
        c.escrow,
        "ConflictOfInterest",
      );
    });

    it("คนอื่นจอง projectId เดียวกันไม่ได้ขวาง client ตัวจริง (escrowId ผูกกับผู้ฝาก)", async () => {
      const c = await networkHelpers.loadFixture(setup);
      const squatId = await c.escrow.read.computeEscrowId([
        A(stranger),
        c.projectId,
      ]);
      await dep(c, { from: stranger, amount: 1n });
      await dep(c);

      assert.notEqual(squatId, c.escrowId);
      assert.equal(
        getAddress((await c.escrow.read.getEscrow([c.escrowId])).client),
        A(client),
      );
      assert.equal(
        getAddress((await c.escrow.read.getEscrow([squatId])).client),
        A(stranger),
      );
    });

    it("ฝากซ้ำ projectId เดิมของ client คนเดิมไม่ได้ แม้ escrow เดิมจบไปแล้ว", async () => {
      const c = await networkHelpers.loadFixture(funded);
      await viem.assertions.revertWithCustomError(
        dep(c),
        c.escrow,
        "AlreadyExists",
      );

      await c.escrow.write.refundClient([c.escrowId], as(client));
      await viem.assertions.revertWithCustomError(
        dep(c),
        c.escrow,
        "AlreadyExists",
      );
    });

    it("ส่ง ETH เข้า contract ตรงๆ (ไม่ผ่าน depositEscrow) ไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(setup);
      await viem.assertions.revert(
        client.sendTransaction({ to: escrow.address, value: 1n }),
      );
    });
  });

  describe("ยอมรับงาน (acceptEscrow)", () => {
    it("เฉพาะ freelancer ที่ระบุ, ต้องส่ง termsHash ตรง, ยอมรับได้ครั้งเดียว", async () => {
      const { escrow, termsHash, escrowId } =
        await networkHelpers.loadFixture(funded);
      await viem.assertions.revertWithCustomError(
        escrow.write.acceptEscrow([escrowId, termsHash], as(stranger)),
        escrow,
        "NotAuthorized",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.acceptEscrow([escrowId, termsHash], as(client)),
        escrow,
        "NotAuthorized",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.acceptEscrow(
          [escrowId, idOf("terms-v2-ที่ไม่ตรง")],
          as(freelancer),
        ),
        escrow,
        "InvalidTerms",
      );

      await escrow.write.acceptEscrow([escrowId, termsHash], as(freelancer));
      await viem.assertions.revertWithCustomError(
        escrow.write.acceptEscrow([escrowId, termsHash], as(freelancer)),
        escrow,
        "InvalidStatus",
      );
    });

    it("ยอมรับหลัง deadline ไม่ได้ และ client ขอเงินคืนได้ตลอดตอนยังไม่ accept", async () => {
      const c = await networkHelpers.loadFixture(funded);
      await time.increaseTo(c.deadline + 1n);
      await viem.assertions.revertWithCustomError(
        c.escrow.write.acceptEscrow([c.escrowId, c.termsHash], as(freelancer)),
        c.escrow,
        "DeadlinePassed",
      );
      const { deltas } = await exec(
        () => c.escrow.write.refundClient([c.escrowId], as(client)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
    });

    it("ใส่ address freelancer ผิด → client ยกเลิกและได้เงินคืนเต็มทันที ไม่ต้องรอ deadline", async () => {
      const c = await networkHelpers.loadFixture(funded);
      const { deltas } = await exec(
        () => c.escrow.write.refundClient([c.escrowId], as(client)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
      assert.equal(await statusOf(c), Status.Refunded);
    });

    it("freelancer ปฏิเสธรับงานได้ → client ได้เงินคืนเต็ม", async () => {
      const c = await networkHelpers.loadFixture(funded);
      const { deltas } = await exec(
        () => c.escrow.write.refundClient([c.escrowId], as(freelancer)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
    });

    it("ก่อน accept: client ปล่อยเงินไม่ได้, freelancer ส่งงานไม่ได้, เปิด dispute ไม่ได้", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(funded);
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([escrowId], as(client)),
        escrow,
        "InvalidStatus",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.submitWork([escrowId, idOf("w")], as(freelancer)),
        escrow,
        "InvalidStatus",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "x"], as(client)),
        escrow,
        "InvalidStatus",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "x"], as(freelancer)),
        escrow,
        "InvalidStatus",
      );
    });
  });

  describe("ส่งงานและช่วงตรวจรับ", () => {
    it("ส่งงานแล้วเริ่มนับช่วงตรวจรับ reviewEndsAt = เวลาส่ง + reviewPeriod", async () => {
      const c = await networkHelpers.loadFixture(submitted);
      const e = await c.escrow.read.getEscrow([c.escrowId]);
      const block = await publicClient.getBlock();
      assert.equal(e.reviewEndsAt, block.timestamp + REVIEW);
    });

    it("ส่งงานได้เฉพาะ freelancer, ก่อน deadline เท่านั้น", async () => {
      const { escrow, deadline, escrowId } =
        await networkHelpers.loadFixture(active);
      await viem.assertions.revertWithCustomError(
        escrow.write.submitWork([escrowId, idOf("w")], as(client)),
        escrow,
        "NotAuthorized",
      );
      await time.increaseTo(deadline + 1n);
      await viem.assertions.revertWithCustomError(
        escrow.write.submitWork([escrowId, idOf("w")], as(freelancer)),
        escrow,
        "DeadlinePassed",
      );
    });

    it("ส่งงานแล้ว client ขอเงินคืนเองไม่ได้ แม้เลย deadline (ต้อง dispute) — ส่งงานปลอมก็ล็อกเงินถาวรไม่ได้", async () => {
      const { escrow, deadline, escrowId } =
        await networkHelpers.loadFixture(submitted);
      await time.increaseTo(deadline + 1n);
      await viem.assertions.revertWithCustomError(
        escrow.write.refundClient([escrowId], as(client)),
        escrow,
        "InvalidStatus",
      );

      // client ปฏิเสธงาน (เปิด dispute) ภายในช่วงตรวจรับ แล้ว arbiter ตัดสินคืนเต็ม
      await escrow.write.openDispute(
        [escrowId, "ไฟล์ที่ส่งมาเป็นไฟล์เปล่า"],
        as(client),
      );
      const { deltas } = await exec(
        () => escrow.write.resolveDispute([escrowId, 0], as(arbiter)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
    });

    it("client เงียบหลังส่งงาน: ก่อนพ้นช่วงตรวจรับ claim ไม่ได้ พ้นแล้ว freelancer เบิกเองได้", async () => {
      const c = await networkHelpers.loadFixture(submitted);
      const { escrow, escrowId } = c;

      await viem.assertions.revertWithCustomError(
        escrow.write.claimAfterReview([escrowId], as(freelancer)),
        escrow,
        "ReviewPeriodActive",
      );

      await time.increase(REVIEW + 1n);
      await viem.assertions.revertWithCustomError(
        escrow.write.claimAfterReview([escrowId], as(stranger)),
        escrow,
        "NotAuthorized",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.claimAfterReview([escrowId], as(client)),
        escrow,
        "NotAuthorized",
      );

      const { receipt, deltas } = await exec(
        () => escrow.write.claimAfterReview([escrowId], as(freelancer)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]);
      assert.deepEqual(eventArgs(c, receipt, "PaymentReleased"), {
        escrowId,
        freelancer: A(freelancer),
        amountToFreelancer: WAGE,
        fee: FEE,
      });
      assert.equal(await statusOf(c), Status.Released);
    });

    it("พ้นช่วงตรวจรับแล้ว client เปิด dispute ไม่ได้ (ReviewPeriodOver)", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(submitted);
      await time.increase(REVIEW + 1n);
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "ช้าไปแล้ว"], as(client)),
        escrow,
        "ReviewPeriodOver",
      );
    });

    it("client ปล่อยเงินได้ทั้งตอน Active (ส่งงานนอกระบบ) และตอน Submitted", async () => {
      const a = await networkHelpers.loadFixture(active);
      const ra = await exec(
        () => a.escrow.write.releasePayment([a.escrowId], as(client)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(ra.deltas, [WAGE, FEE]);

      const s = await networkHelpers.loadFixture(submitted);
      const rs = await exec(
        () => s.escrow.write.releasePayment([s.escrowId], as(client)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(rs.deltas, [WAGE, FEE]);
    });

    it("ปล่อยเงินซ้ำ / คนอื่นปล่อยเงินไม่ได้", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(active);
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([escrowId], as(freelancer)),
        escrow,
        "NotAuthorized",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([escrowId], as(stranger)),
        escrow,
        "NotAuthorized",
      );
      await escrow.write.releasePayment([escrowId], as(client));
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([escrowId], as(client)),
        escrow,
        "InvalidStatus",
      );
    });
  });

  describe("คืนเงิน (refundClient)", () => {
    it("client ขอคืนได้หลัง deadline ถ้ายังไม่ส่งงาน (ได้คืนเต็ม 1.05 ETH) ก่อนหน้านั้นไม่ได้", async () => {
      const c = await networkHelpers.loadFixture(active);
      await viem.assertions.revertWithCustomError(
        c.escrow.write.refundClient([c.escrowId], as(client)),
        c.escrow,
        "NotYetRefundable",
      );
      await time.increaseTo(c.deadline + 1n);
      const { receipt, deltas } = await exec(
        () => c.escrow.write.refundClient([c.escrowId], as(client)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
      assert.deepEqual(eventArgs(c, receipt, "EscrowRefunded"), {
        escrowId: c.escrowId,
        client: A(client),
        amount: TOTAL,
      });
      assert.equal(await statusOf(c), Status.Refunded);
    });

    it("freelancer ยกเลิกงานตอนไหนก็ได้ก่อนจบ → client ได้เงินคืนทันที", async () => {
      const a = await networkHelpers.loadFixture(active);
      const ra = await exec(
        () => a.escrow.write.refundClient([a.escrowId], as(freelancer)),
        [A(client)],
      );
      assert.deepEqual(ra.deltas, [TOTAL]);

      const s = await networkHelpers.loadFixture(submitted);
      const rs = await exec(
        () => s.escrow.write.refundClient([s.escrowId], as(freelancer)),
        [A(client)],
      );
      assert.deepEqual(rs.deltas, [TOTAL]);
    });

    it("คนอื่นขอคืนเงินไม่ได้ และคืนซ้ำไม่ได้", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(funded);
      await viem.assertions.revertWithCustomError(
        escrow.write.refundClient([escrowId], as(stranger)),
        escrow,
        "NotAuthorized",
      );
      await escrow.write.refundClient([escrowId], as(client));
      await viem.assertions.revertWithCustomError(
        escrow.write.refundClient([escrowId], as(client)),
        escrow,
        "InvalidStatus",
      );
    });
  });

  describe("ข้อพิพาท (dispute)", () => {
    it("เปิด dispute: บันทึก arbiter ณ ตอนนั้น, client ปล่อยเงินเองไม่ได้ระหว่างพิพาท", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(active);
      await viem.assertions.emitWithArgs(
        escrow.write.openDispute([escrowId, "client ไม่ตอบกลับ"], as(freelancer)),
        escrow,
        "DisputeOpened",
        [escrowId, A(freelancer), "client ไม่ตอบกลับ", A(arbiter)],
      );

      const e = await escrow.read.getEscrow([escrowId]);
      assert.equal(e.status, Status.Disputed);
      assert.equal(getAddress(e.arbiter), A(arbiter));

      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([escrowId], as(client)),
        escrow,
        "InvalidStatus",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.refundClient([escrowId], as(client)),
        escrow,
        "InvalidStatus",
      );
    });

    it("freelancer เปิด dispute หลัง deadline ไม่ได้ จึงขวางสิทธิ์คืนเงินของ client ไม่ได้", async () => {
      const { escrow, deadline, escrowId } =
        await networkHelpers.loadFixture(active);
      await time.increaseTo(deadline + 1n);
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "ขอเวลาเพิ่ม"], as(freelancer)),
        escrow,
        "DeadlinePassed",
      );
      const { deltas } = await exec(
        () => escrow.write.refundClient([escrowId], as(client)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
    });

    it("ตอน Submitted มีแต่ client ที่เปิด dispute ได้ (freelancer ต้องรอ claimAfterReview)", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(submitted);
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "x"], as(freelancer)),
        escrow,
        "InvalidStatus",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "x"], as(stranger)),
        escrow,
        "NotAuthorized",
      );
    });

    it("arbiter ตัดสินให้ freelancer 100% (เท่ากับปล่อยเงิน)", async () => {
      const c = await networkHelpers.loadFixture(disputed);
      const { receipt, deltas } = await exec(
        () => c.escrow.write.resolveDispute([c.escrowId, 10000], as(arbiter)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]);
      assert.deepEqual(eventArgs(c, receipt, "DisputeResolved"), {
        escrowId: c.escrowId,
        freelancerBps: 10000,
        toFreelancer: WAGE,
        toClient: 0n,
        feePaid: FEE,
        byTimeout: false,
      });
      const e = await c.escrow.read.getEscrow([c.escrowId]);
      assert.equal(e.status, Status.Resolved);
      assert.equal(e.payoutBps, 10000);
    });

    it("arbiter ตัดสินให้ client 100% (คืนเต็มรวมค่าธรรมเนียม แพลตฟอร์มไม่ได้อะไร)", async () => {
      const c = await networkHelpers.loadFixture(disputed);
      const { deltas } = await exec(
        () => c.escrow.write.resolveDispute([c.escrowId, 0], as(arbiter)),
        [A(client), A(treasury)],
      );
      assert.deepEqual(deltas, [TOTAL, 0n]);
    });

    it("arbiter แบ่ง 60/40: ค่าธรรมเนียมคิดตามสัดส่วน ผลรวมครบทุก wei", async () => {
      const c = await networkHelpers.loadFixture(disputed);
      // freelancer 0.6, แพลตฟอร์ม 0.03, client 0.4 + ค่าธรรมเนียมส่วนที่เหลือ 0.02 = 0.42
      const { receipt, deltas } = await exec(
        () => c.escrow.write.resolveDispute([c.escrowId, 6000], as(arbiter)),
        [A(freelancer), A(treasury), A(client)],
      );
      assert.deepEqual(deltas, [
        parseEther("0.6"),
        parseEther("0.03"),
        parseEther("0.42"),
      ]);
      assert.deepEqual(eventArgs(c, receipt, "DisputeResolved"), {
        escrowId: c.escrowId,
        freelancerBps: 6000,
        toFreelancer: parseEther("0.6"),
        toClient: parseEther("0.42"),
        feePaid: parseEther("0.03"),
        byTimeout: false,
      });
      assert.equal(await balanceOf(c.escrow.address), 0n);
    });

    it("ตัดสินไม่ได้ถ้าไม่ใช่ arbiter / สัดส่วนเกิน 100% / ไม่ได้อยู่ในสถานะพิพาท", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(disputed);
      await viem.assertions.revertWithCustomError(
        escrow.write.resolveDispute([escrowId, 0], as(client)),
        escrow,
        "NotAuthorized",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.resolveDispute([escrowId, 10001], as(arbiter)),
        escrow,
        "InvalidShare",
      );
      await escrow.write.resolveDispute([escrowId, 5000], as(arbiter));
      await viem.assertions.revertWithCustomError(
        escrow.write.resolveDispute([escrowId, 5000], as(arbiter)),
        escrow,
        "InvalidStatus",
      );
    });

    it("owner เปลี่ยน arbiter กลางคันไม่ได้ผลกับ dispute ที่เปิดไปแล้ว (ใช้ arbiter ตอนเปิด)", async () => {
      const c = await networkHelpers.loadFixture(disputed);
      await viem.assertions.emitWithArgs(
        c.escrow.write.setArbiter([A(stranger)], as(owner)),
        c.escrow,
        "ArbiterUpdated",
        [A(arbiter), A(stranger)],
      );

      await viem.assertions.revertWithCustomError(
        c.escrow.write.resolveDispute([c.escrowId, 0], as(stranger)),
        c.escrow,
        "NotAuthorized",
      );
      await c.escrow.write.resolveDispute([c.escrowId, 0], as(arbiter));
      assert.equal(await statusOf(c), Status.Resolved);
    });

    it("ถ้า arbiter ปัจจุบันเป็นคู่กรณี จะเปิด dispute ไม่ได้ (ConflictOfInterest)", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(active);
      await escrow.write.setArbiter([A(client)], as(owner));
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([escrowId, "x"], as(client)),
        escrow,
        "ConflictOfInterest",
      );
    });

    it("arbiter เงียบเกินกำหนด → คู่กรณีสั่งแบ่งครึ่งได้ (ก่อนหมดเวลาไม่ได้)", async () => {
      const c = await networkHelpers.loadFixture(disputed);
      const { escrow, escrowId } = c;

      await viem.assertions.revertWithCustomError(
        escrow.write.settleExpiredDispute([escrowId], as(client)),
        escrow,
        "DisputeNotExpired",
      );

      await time.increase(ARBITER_TIMEOUT + 1n);
      await viem.assertions.revertWithCustomError(
        escrow.write.settleExpiredDispute([escrowId], as(stranger)),
        escrow,
        "NotAuthorized",
      );

      // freelancer 0.5, แพลตฟอร์ม 0.025, client 0.5 + 0.025 = 0.525
      const { receipt, deltas } = await exec(
        () => escrow.write.settleExpiredDispute([escrowId], as(freelancer)),
        [A(freelancer), A(treasury), A(client)],
      );
      assert.deepEqual(deltas, [
        parseEther("0.5"),
        parseEther("0.025"),
        parseEther("0.525"),
      ]);
      assert.deepEqual(eventArgs(c, receipt, "DisputeResolved"), {
        escrowId,
        freelancerBps: 5000,
        toFreelancer: parseEther("0.5"),
        toClient: parseEther("0.525"),
        feePaid: parseEther("0.025"),
        byTimeout: true,
      });

      // ปิดแล้ว arbiter มาตัดสินซ้ำไม่ได้
      await viem.assertions.revertWithCustomError(
        escrow.write.resolveDispute([escrowId, 0], as(arbiter)),
        escrow,
        "InvalidStatus",
      );
    });
  });

  describe("ผู้รับเงินเป็น contract (pull-payment fallback)", () => {
    async function withMockFreelancer() {
      const c = await setup();
      const mock = await viem.deployContract("FreelancerMock", [
        c.escrow.address,
      ]);
      await dep(c, { to: mock.address });
      await mock.write.accept([c.escrowId, c.termsHash]);
      return { ...c, mock };
    }

    it("freelancer ปฏิเสธ ETH → ปล่อยเงินไม่ล้ม ยอดค้างไว้ให้เบิกเอง และค่าธรรมเนียมไม่ถูกขวาง", async () => {
      const c = await networkHelpers.loadFixture(withMockFreelancer);
      const { escrow, mock, escrowId } = c;

      const { receipt, deltas } = await exec(
        () => escrow.write.releasePayment([escrowId], as(client)),
        [A(treasury)],
      );
      assert.deepEqual(eventArgs(c, receipt, "PayoutDeferred"), {
        to: getAddress(mock.address),
        amount: WAGE,
      });
      assert.deepEqual(deltas, [FEE]);
      assert.equal(await escrow.read.pendingWithdrawals([mock.address]), WAGE);
      assert.equal(await balanceOf(escrow.address), WAGE);

      await mock.write.setAcceptEth([true]);
      const pulled = await exec(() => mock.write.pull(), [mock.address]);
      assert.deepEqual(pulled.deltas, [WAGE]);
      assert.equal(await escrow.read.pendingWithdrawals([mock.address]), 0n);
      assert.equal(await balanceOf(escrow.address), 0n);

      await viem.assertions.revertWithCustomError(
        mock.write.pull(),
        escrow,
        "InvalidAmount",
      );
    });

    it("ตัดสินแบ่งส่วนโดยฝั่ง freelancer ปฏิเสธ ETH → ส่วนของ client ยังได้ทันที", async () => {
      const { escrow, mock, escrowId } =
        await networkHelpers.loadFixture(withMockFreelancer);
      await escrow.write.openDispute([escrowId, "x"], as(client));

      const { deltas } = await exec(
        () => escrow.write.resolveDispute([escrowId, 5000], as(arbiter)),
        [A(client), A(treasury)],
      );
      assert.deepEqual(deltas, [parseEther("0.525"), parseEther("0.025")]);
      assert.equal(
        await escrow.read.pendingWithdrawals([mock.address]),
        parseEther("0.5"),
      );
    });

    it("ผู้รับพยายาม re-enter ระหว่างรับเงิน → ถูกบล็อก ยอดไม่เพี้ยน", async () => {
      const { escrow, mock, escrowId } =
        await networkHelpers.loadFixture(withMockFreelancer);
      await mock.write.setAttack([true]);

      const { deltas } = await exec(
        () => escrow.write.releasePayment([escrowId], as(client)),
        [mock.address, A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]);
      assert.equal(await mock.read.reentryBlocked(), true);
      assert.equal(await balanceOf(escrow.address), 0n);
    });
  });

  describe("ขอแก้ไขงาน (requestRevision)", () => {
    const requestRevision = (c: Ctx, reason = "แก้ตามที่คุยกัน") =>
      c.escrow.write.requestRevision([c.escrowId, reason], as(client));
    const resubmit = (c: Ctx, tag = "v2") =>
      c.escrow.write.submitWork([c.escrowId, idOf(`work-${tag}`)], as(freelancer));

    it("client ขอแก้ → กลับ Active, นับรอบ, ขยาย deadline; freelancer ส่งใหม่แล้วนับช่วงตรวจรับใหม่", async () => {
      const c = await networkHelpers.loadFixture(submitted);
      const { escrow, escrowId } = c;

      const { receipt } = await exec(() => requestRevision(c, "แก้สีโลโก้"), []);
      const block = await publicClient.getBlock({
        blockNumber: receipt.blockNumber,
      });
      const e = await escrow.read.getEscrow([escrowId]);
      assert.equal(e.status, Status.Active);
      assert.equal(e.revisionCount, 1);
      assert.equal(e.reviewEndsAt, 0n);
      // deadline เดิม (ตอนตั้งต้น) น้อยกว่า now + revisionPeriod จึงถูกขยาย
      assert.equal(e.deadline, block.timestamp + REVISION_PERIOD);
      assert.deepEqual(eventArgs(c, receipt, "RevisionRequested"), {
        escrowId,
        revisionNumber: 1,
        reason: "แก้สีโลโก้",
        newDeadline: e.deadline,
      });

      // ระหว่างแก้งาน freelancer เบิกเงินเองไม่ได้ (ไม่ใช่สถานะ Submitted)
      await viem.assertions.revertWithCustomError(
        escrow.write.claimAfterReview([escrowId], as(freelancer)),
        escrow,
        "InvalidStatus",
      );

      // ส่งใหม่ → Submitted และเริ่มนับช่วงตรวจรับใหม่
      const second = await exec(() => resubmit(c), []);
      const block2 = await publicClient.getBlock({
        blockNumber: second.receipt.blockNumber,
      });
      const e2 = await escrow.read.getEscrow([escrowId]);
      assert.equal(e2.status, Status.Submitted);
      assert.equal(e2.reviewEndsAt, block2.timestamp + REVIEW);
      await viem.assertions.revertWithCustomError(
        escrow.write.claimAfterReview([escrowId], as(freelancer)),
        escrow,
        "ReviewPeriodActive",
      );

      // client พอใจรอบนี้ → ปล่อยเงินตามปกติ
      const { deltas } = await exec(
        () => escrow.write.releasePayment([escrowId], as(client)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]);
    });

    it("ขอแก้ได้ maxRevisions ครั้งต่อ escrow (ส่งงานได้ 3 รอบ) ครั้งที่ 3 ถูกปฏิเสธ แต่ยังปล่อยเงินได้", async () => {
      const c = await networkHelpers.loadFixture(submitted);
      for (let i = 1; i <= MAX_REVISIONS; i++) {
        await requestRevision(c);
        assert.equal(
          (await c.escrow.read.getEscrow([c.escrowId])).revisionCount,
          i,
        );
        await resubmit(c, `v${i + 1}`);
      }

      await viem.assertions.revertWithCustomError(
        requestRevision(c),
        c.escrow,
        "RevisionLimitReached",
      );
      assert.equal(await statusOf(c), Status.Submitted);

      const { deltas } = await exec(
        () => c.escrow.write.releasePayment([c.escrowId], as(client)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]);
    });

    it("ครบจำนวนรอบแล้ว client ยังปฏิเสธงานผ่าน openDispute ได้", async () => {
      const c = await networkHelpers.loadFixture(submitted);
      for (let i = 1; i <= MAX_REVISIONS; i++) {
        await requestRevision(c);
        await resubmit(c, `v${i + 1}`);
      }
      await c.escrow.write.openDispute([c.escrowId, "ยังไม่ผ่าน"], as(client));
      assert.equal(await statusOf(c), Status.Disputed);
    });

    it("เฉพาะ client, เฉพาะสถานะ Submitted และเฉพาะในช่วงตรวจรับ", async () => {
      const s = await networkHelpers.loadFixture(submitted);
      for (const who of [freelancer, stranger, arbiter]) {
        await viem.assertions.revertWithCustomError(
          s.escrow.write.requestRevision([s.escrowId, "x"], as(who)),
          s.escrow,
          "NotAuthorized",
        );
      }

      const a = await networkHelpers.loadFixture(active);
      await viem.assertions.revertWithCustomError(
        requestRevision(a),
        a.escrow,
        "InvalidStatus",
      );

      const late = await networkHelpers.loadFixture(submitted);
      await time.increase(REVIEW + 1n);
      await viem.assertions.revertWithCustomError(
        requestRevision(late),
        late.escrow,
        "ReviewPeriodOver",
      );
    });

    it("deadline ที่ไกลกว่า revisionPeriod อยู่แล้วไม่ถูกย่อ", async () => {
      const c = await networkHelpers.loadFixture(setup);
      const far = BigInt(await time.latest()) + 30n * DAY;
      await dep(c, { deadline: far });
      await c.escrow.write.acceptEscrow([c.escrowId, c.termsHash], as(freelancer));
      await c.escrow.write.submitWork([c.escrowId, idOf("w")], as(freelancer));
      await requestRevision(c);
      assert.equal((await c.escrow.read.getEscrow([c.escrowId])).deadline, far);
    });

    it("client ตั้ง deadline เองไม่ได้ และหลังขอแก้แล้วขอเงินคืนเองไม่ได้ (ต้อง dispute)", async () => {
      const c = await networkHelpers.loadFixture(submitted);
      await requestRevision(c);
      const { deadline } = await c.escrow.read.getEscrow([c.escrowId]);

      // ทั้งก่อนและหลังถึง deadline ใหม่ ก็ขอเงินคืนเองไม่ได้
      await viem.assertions.revertWithCustomError(
        c.escrow.write.refundClient([c.escrowId], as(client)),
        c.escrow,
        "DisputeRequired",
      );
      await time.increaseTo(deadline + 1n);
      await viem.assertions.revertWithCustomError(
        c.escrow.write.refundClient([c.escrowId], as(client)),
        c.escrow,
        "DisputeRequired",
      );

      // freelancer ไม่ส่งงานแก้ทัน → client เปิด dispute แล้ว arbiter ตัดสิน
      await c.escrow.write.openDispute([c.escrowId, "ไม่ส่งงานแก้"], as(client));
      const { deltas } = await exec(
        () => c.escrow.write.resolveDispute([c.escrowId, 5000], as(arbiter)),
        [A(freelancer), A(client)],
      );
      assert.deepEqual(deltas, [parseEther("0.5"), parseEther("0.525")]);
    });

    it("ระหว่างแก้งาน freelancer ยกเลิกคืนเงิน หรือเปิด dispute (ก่อน deadline ใหม่) ได้", async () => {
      const a = await networkHelpers.loadFixture(submitted);
      await requestRevision(a);
      const { deltas } = await exec(
        () => a.escrow.write.refundClient([a.escrowId], as(freelancer)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);

      const b = await networkHelpers.loadFixture(submitted);
      await requestRevision(b);
      await b.escrow.write.openDispute([b.escrowId, "ขอแก้เกินตกลง"], as(freelancer));
      assert.equal(await statusOf(b), Status.Disputed);
    });

    it("ไม่เคยส่งงาน: client ยังขอเงินคืนหลัง deadline ได้เหมือนเดิม", async () => {
      const c = await networkHelpers.loadFixture(active);
      await time.increaseTo(c.deadline + 1n);
      const { deltas } = await exec(
        () => c.escrow.write.refundClient([c.escrowId], as(client)),
        [A(client)],
      );
      assert.deepEqual(deltas, [TOTAL]);
    });

    it("maxRevisions = 0 ปิดฟีเจอร์ขอแก้งาน", async () => {
      const escrow = await viem.deployContract("FreelinkEscrow", [
        A(arbiter),
        A(treasury),
        FEE_BPS,
        REVIEW,
        ARBITER_TIMEOUT,
        REVISION_PERIOD,
        0,
      ]);
      const projectId = idOf("no-revisions");
      const termsHash = idOf("t");
      const deadline = BigInt(await time.latest()) + 7n * DAY;
      const escrowId = await escrow.read.computeEscrowId([A(client), projectId]);
      const c = { escrow, projectId, termsHash, deadline, escrowId };
      await dep(c);
      await escrow.write.acceptEscrow([escrowId, termsHash], as(freelancer));
      await escrow.write.submitWork([escrowId, idOf("w")], as(freelancer));
      await viem.assertions.revertWithCustomError(
        escrow.write.requestRevision([escrowId, "x"], as(client)),
        escrow,
        "RevisionLimitReached",
      );
    });
  });

  describe("แอดมิน", () => {
    it("เฉพาะ owner ตั้งค่าได้ และ feeBps เกิน 10% ไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(setup);
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeBps([100], as(stranger)),
        escrow,
        "OwnableUnauthorizedAccount",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeBps([1001], as(owner)),
        escrow,
        "FeeTooHigh",
      );
      await viem.assertions.emitWithArgs(
        escrow.write.setFeeBps([1000], as(owner)),
        escrow,
        "FeeBpsUpdated",
        [500, 1000],
      );
    });

    it("setArbiter / setFeeRecipient: เฉพาะ owner, ห้าม address 0, และมี event", async () => {
      const { escrow } = await networkHelpers.loadFixture(setup);
      await viem.assertions.revertWithCustomError(
        escrow.write.setArbiter([A(stranger)], as(stranger)),
        escrow,
        "OwnableUnauthorizedAccount",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeRecipient([A(stranger)], as(stranger)),
        escrow,
        "OwnableUnauthorizedAccount",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setArbiter([zeroAddress], as(owner)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeRecipient([zeroAddress], as(owner)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.emitWithArgs(
        escrow.write.setFeeRecipient([A(stranger)], as(owner)),
        escrow,
        "FeeRecipientUpdated",
        [A(treasury), A(stranger)],
      );
      assert.equal(getAddress(await escrow.read.feeRecipient()), A(stranger));
    });

    it("เปลี่ยน feeBps ไม่กระทบ escrow ที่ฝากไปแล้ว (ใช้ค่า snapshot)", async () => {
      const { escrow, escrowId } = await networkHelpers.loadFixture(active);
      await escrow.write.setFeeBps([1000], as(owner));
      const { deltas } = await exec(
        () => escrow.write.releasePayment([escrowId], as(client)),
        [A(freelancer), A(treasury)],
      );
      assert.deepEqual(deltas, [WAGE, FEE]); // ยังใช้ 5% เดิม
    });

    it("ค่า constructor ผิดปกติถูกปฏิเสธ", async () => {
      const { escrow } = await networkHelpers.loadFixture(setup);
      const base = [
        A(arbiter),
        A(treasury),
        FEE_BPS,
        REVIEW,
        ARBITER_TIMEOUT,
        REVISION_PERIOD,
        MAX_REVISIONS,
      ] as const;
      const withArg = (i: number, v: unknown) =>
        base.map((x, j) => (j === i ? v : x)) as unknown as typeof base;
      const deploy = (args: typeof base) =>
        viem.deployContract("FreelinkEscrow", args);

      await viem.assertions.revertWithCustomError(
        deploy(withArg(0, zeroAddress)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(1, zeroAddress)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(2, 1001)),
        escrow,
        "FeeTooHigh",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(3, 0n)),
        escrow,
        "InvalidDuration",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(3, 31n * DAY)),
        escrow,
        "InvalidDuration",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(4, 91n * DAY)),
        escrow,
        "InvalidDuration",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(5, 0n)),
        escrow,
        "InvalidDuration",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(5, 31n * DAY)),
        escrow,
        "InvalidDuration",
      );
      await viem.assertions.revertWithCustomError(
        deploy(withArg(6, 11)),
        escrow,
        "InvalidLimit",
      );
    });

    it("ค่าเริ่มต้นของ contract ถูกต้อง", async () => {
      const { escrow } = await networkHelpers.loadFixture(setup);
      assert.equal(getAddress(await escrow.read.owner()), A(owner));
      assert.equal(getAddress(await escrow.read.arbiter()), A(arbiter));
      assert.equal(getAddress(await escrow.read.feeRecipient()), A(treasury));
      assert.equal(await escrow.read.feeBps(), FEE_BPS);
      assert.equal(await escrow.read.reviewPeriod(), REVIEW);
      assert.equal(await escrow.read.arbiterTimeout(), ARBITER_TIMEOUT);
      assert.equal(await escrow.read.revisionPeriod(), REVISION_PERIOD);
      assert.equal(await escrow.read.maxRevisions(), MAX_REVISIONS);
    });
  });

  describe("ความครบถ้วนของยอดเงิน", () => {
    it("ทุกสัดส่วน/ทุกยอด (รวมยอดจิ๋วที่ปัดเศษ) แบ่งแล้วรวมเท่ายอดฝากพอดี ไม่มี wei ค้างใน contract", async () => {
      const c = await networkHelpers.loadFixture(setup);
      const { escrow, termsHash } = c;
      const amounts = [1n, 7n, 999n, 12_345n, 123_456_789_123_456_789n];
      const shares = [0, 1, 3333, 5000, 9999, 10000];
      let n = 0;

      for (const amount of amounts) {
        for (const share of shares) {
          const projectId = idOf(`conservation-${n++}`);
          const deadline = BigInt(await time.latest()) + 7n * DAY;
          const id = await escrow.read.computeEscrowId([A(client), projectId]);
          const [, total] = await escrow.read.quote([amount]);

          await dep(c, { projectId, deadline, amount, value: total });
          await escrow.write.acceptEscrow([id, termsHash], as(freelancer));
          await escrow.write.openDispute([id, "t"], as(client));

          const { receipt } = await exec(
            () => escrow.write.resolveDispute([id, share], as(arbiter)),
            [],
          );
          const ev = eventArgs(c, receipt, "DisputeResolved")!;
          assert.equal(
            (ev.toFreelancer as bigint) +
              (ev.toClient as bigint) +
              (ev.feePaid as bigint),
            total,
          );
          assert.equal(await balanceOf(escrow.address), 0n);
        }
      }
    });
  });
});
