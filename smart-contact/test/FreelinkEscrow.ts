import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, keccak256, stringToHex, zeroAddress } from "viem";

// เหมือน ethers.id(str) — ใช้แปลง project.id (string) → bytes32 ให้ตรงกันทุกฝั่ง
const idOf = (s: string) => keccak256(stringToHex(s));

const Status = {
  Unfunded: 0,
  Funded: 1,
  Released: 2,
  Refunded: 3,
  Disputed: 4,
} as const;

const USDC = 10n ** 6n;
const AMOUNT = 1000n * USDC;
const FEE_BPS = 250; // 2.5%
const WEEK = 7n * 24n * 3600n;

describe("FreelinkEscrow", async function () {
  const { viem, networkHelpers } = await network.create();
  const [owner, client, freelancer, arbiter, treasury, stranger] =
    await viem.getWalletClients();

  const projectId = idOf("project-1");

  async function deployFixture() {
    const token = await viem.deployContract("MockUSDC");
    const escrow = await viem.deployContract("FreelinkEscrow", [
      token.address,
      arbiter.account.address,
      treasury.account.address,
      FEE_BPS,
    ]);

    await token.write.mint([client.account.address, AMOUNT]);
    await token.write.approve([escrow.address, AMOUNT], {
      account: client.account,
    });

    const deadline = BigInt(await networkHelpers.time.latest()) + WEEK;
    return { token, escrow, deadline };
  }

  async function fundedFixture() {
    const ctx = await deployFixture();
    await ctx.escrow.write.depositEscrow(
      [projectId, freelancer.account.address, AMOUNT, ctx.deadline],
      { account: client.account },
    );
    return ctx;
  }

  async function disputedFixture() {
    const ctx = await fundedFixture();
    await ctx.escrow.write.openDispute([projectId], {
      account: freelancer.account,
    });
    return ctx;
  }

  const balanceOf = async (
    token: Awaited<ReturnType<typeof deployFixture>>["token"],
    who: { account: { address: `0x${string}` } },
  ) => token.read.balanceOf([who.account.address]);

  describe("constructor", () => {
    it("เก็บค่าเริ่มต้นถูกต้อง", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(deployFixture);

      assert.equal(
        getAddress(await escrow.read.token()),
        getAddress(token.address),
      );
      assert.equal(
        getAddress(await escrow.read.owner()),
        getAddress(owner.account.address),
      );
      assert.equal(
        getAddress(await escrow.read.arbiter()),
        getAddress(arbiter.account.address),
      );
      assert.equal(
        getAddress(await escrow.read.feeRecipient()),
        getAddress(treasury.account.address),
      );
      assert.equal(await escrow.read.feeBps(), FEE_BPS);
      assert.equal(await escrow.read.MAX_FEE_BPS(), 1000);
    });

    it("revert ถ้า address เป็น 0 หรือ fee เกิน 10%", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(deployFixture);
      const a = arbiter.account.address;
      const t = treasury.account.address;
      const args = (
        ...over: [`0x${string}`?, `0x${string}`?, `0x${string}`?, number?]
      ) =>
        [
          over[0] ?? token.address,
          over[1] ?? a,
          over[2] ?? t,
          over[3] ?? 0,
        ] as const;

      await viem.assertions.revertWithCustomError(
        viem.deployContract("FreelinkEscrow", args(zeroAddress)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        viem.deployContract("FreelinkEscrow", args(undefined, zeroAddress)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        viem.deployContract("FreelinkEscrow", args(undefined, undefined, zeroAddress)),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        viem.deployContract("FreelinkEscrow", args(undefined, undefined, undefined, 1001)),
        escrow,
        "FeeTooHigh",
      );
    });
  });

  describe("depositEscrow", () => {
    it("ฝากเงินสำเร็จ: เก็บข้อมูล, ย้ายเหรียญ, ปล่อย event", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.emitWithArgs(
        escrow.write.depositEscrow(
          [projectId, freelancer.account.address, AMOUNT, deadline],
          { account: client.account },
        ),
        escrow,
        "EscrowFunded",
        [
          projectId,
          getAddress(client.account.address),
          getAddress(freelancer.account.address),
          AMOUNT,
          deadline,
        ],
      );

      const e = await escrow.read.getEscrow([projectId]);
      assert.equal(getAddress(e.client), getAddress(client.account.address));
      assert.equal(
        getAddress(e.freelancer),
        getAddress(freelancer.account.address),
      );
      assert.equal(e.amount, AMOUNT);
      assert.equal(e.deadline, deadline);
      assert.equal(e.feeBps, FEE_BPS);
      assert.equal(e.workSubmitted, false);
      assert.equal(e.status, Status.Funded);

      assert.equal(await balanceOf(token, client), 0n);
      assert.equal(await token.read.balanceOf([escrow.address]), AMOUNT);
    });

    it("projectId ที่ยังไม่เคยฝากมีสถานะ Unfunded", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);
      const e = await escrow.read.getEscrow([idOf("nope")]);
      assert.equal(e.status, Status.Unfunded);
      assert.equal(e.amount, 0n);
    });

    it("ฝากซ้ำ projectId เดิมไม่ได้", async () => {
      const { escrow, deadline } =
        await networkHelpers.loadFixture(fundedFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow(
          [projectId, freelancer.account.address, AMOUNT, deadline],
          { account: client.account },
        ),
        escrow,
        "AlreadyExists",
      );
    });

    it("amount = 0 ไม่ได้", async () => {
      const { escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow(
          [projectId, freelancer.account.address, 0n, deadline],
          { account: client.account },
        ),
        escrow,
        "InvalidAmount",
      );
    });

    it("freelancer เป็น address 0 หรือเป็น client เอง ไม่ได้", async () => {
      const { escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow([projectId, zeroAddress, AMOUNT, deadline], {
          account: client.account,
        }),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow(
          [projectId, client.account.address, AMOUNT, deadline],
          { account: client.account },
        ),
        escrow,
        "InvalidAddress",
      );
    });

    it("deadline ต้องอยู่ในอนาคต", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);
      const past = BigInt(await networkHelpers.time.latest()) - 1n;
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow(
          [projectId, freelancer.account.address, AMOUNT, past],
          { account: client.account },
        ),
        escrow,
        "InvalidDeadline",
      );
    });

    it("revert ถ้ายังไม่ approve หรือเหรียญไม่พอ และไม่ทิ้ง state ค้าง", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);

      // stranger ไม่ได้ approve
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow(
          [projectId, freelancer.account.address, AMOUNT, deadline],
          { account: stranger.account },
        ),
        token,
        "ERC20InsufficientAllowance",
      );

      // approve แล้วแต่เหรียญไม่พอ
      await token.write.approve([escrow.address, AMOUNT], {
        account: stranger.account,
      });
      await viem.assertions.revertWithCustomError(
        escrow.write.depositEscrow(
          [projectId, freelancer.account.address, AMOUNT, deadline],
          { account: stranger.account },
        ),
        token,
        "ERC20InsufficientBalance",
      );
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Unfunded,
      );
      assert.equal(await token.read.balanceOf([escrow.address]), 0n);
    });
  });

  describe("submitWork", () => {
    it("freelancer ส่งงานได้ และ emit workHash", async () => {
      const { escrow } = await networkHelpers.loadFixture(fundedFixture);
      const workHash = idOf("https://example.com/work");

      await viem.assertions.emitWithArgs(
        escrow.write.submitWork([projectId, workHash], {
          account: freelancer.account,
        }),
        escrow,
        "WorkSubmitted",
        [projectId, getAddress(freelancer.account.address), workHash],
      );
      assert.equal(
        (await escrow.read.getEscrow([projectId])).workSubmitted,
        true,
      );
      // สถานะยังเป็น Funded (เงินยังไม่ขยับ)
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Funded,
      );
    });

    it("คนอื่นส่งงานไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(fundedFixture);
      for (const who of [client, stranger]) {
        await viem.assertions.revertWithCustomError(
          escrow.write.submitWork([projectId, idOf("x")], {
            account: who.account,
          }),
          escrow,
          "NotAuthorized",
        );
      }
    });

    it("ส่งงานไม่ได้ถ้าไม่ได้อยู่สถานะ Funded", async () => {
      const { escrow } = await networkHelpers.loadFixture(disputedFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.submitWork([projectId, idOf("x")], {
          account: freelancer.account,
        }),
        escrow,
        "InvalidStatus",
      );
    });
  });

  describe("releasePayment", () => {
    it("ฝาก → ส่งงาน → ปล่อยเงิน หักค่าธรรมเนียม 2.5%", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(fundedFixture);

      await escrow.write.submitWork([projectId, idOf("work")], {
        account: freelancer.account,
      });

      await viem.assertions.emitWithArgs(
        escrow.write.releasePayment([projectId], { account: client.account }),
        escrow,
        "PaymentReleased",
        [
          projectId,
          getAddress(freelancer.account.address),
          975n * USDC,
          25n * USDC,
        ],
      );

      assert.equal(await balanceOf(token, freelancer), 975n * USDC);
      assert.equal(await balanceOf(token, treasury), 25n * USDC);
      assert.equal(await token.read.balanceOf([escrow.address]), 0n);
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Released,
      );
    });

    it("client ปล่อยเงินได้แม้ freelancer ยังไม่กดส่งงาน (client เป็นผู้ตัดสิน)", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(fundedFixture);
      await escrow.write.releasePayment([projectId], {
        account: client.account,
      });
      assert.equal(await balanceOf(token, freelancer), 975n * USDC);
    });

    it("fee = 0 → ไม่โอนให้ผู้รับค่าธรรมเนียม และไม่ emit ผิด", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);
      await escrow.write.setFeeBps([0]);
      await escrow.write.depositEscrow(
        [projectId, freelancer.account.address, AMOUNT, deadline],
        { account: client.account },
      );
      await escrow.write.releasePayment([projectId], {
        account: client.account,
      });
      assert.equal(await balanceOf(token, freelancer), AMOUNT);
      assert.equal(await balanceOf(token, treasury), 0n);
    });

    it("คนอื่นปล่อยเงินไม่ได้ (freelancer / arbiter / owner / stranger)", async () => {
      const { escrow } = await networkHelpers.loadFixture(fundedFixture);
      for (const who of [freelancer, arbiter, owner, stranger]) {
        await viem.assertions.revertWithCustomError(
          escrow.write.releasePayment([projectId], { account: who.account }),
          escrow,
          "NotAuthorized",
        );
      }
    });

    it("ปล่อยซ้ำไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(fundedFixture);
      await escrow.write.releasePayment([projectId], {
        account: client.account,
      });
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([projectId], { account: client.account }),
        escrow,
        "InvalidStatus",
      );
    });

    it("ปล่อยเงินของ projectId ที่ไม่มีอยู่ไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([idOf("ghost")], {
          account: client.account,
        }),
        escrow,
        "NotAuthorized",
      );
    });

    it("ปล่อยเงินตอนมีข้อพิพาทไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(disputedFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.releasePayment([projectId], { account: client.account }),
        escrow,
        "InvalidStatus",
      );
    });
  });

  describe("refundClient", () => {
    it("client ขอคืนเงินได้หลัง deadline ถ้ายังไม่ส่งงาน", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(fundedFixture);

      await viem.assertions.revertWithCustomError(
        escrow.write.refundClient([projectId], { account: client.account }),
        escrow,
        "NotYetRefundable",
      );

      await networkHelpers.time.increaseTo(deadline + 1n);

      await viem.assertions.emitWithArgs(
        escrow.write.refundClient([projectId], { account: client.account }),
        escrow,
        "EscrowRefunded",
        [projectId, getAddress(client.account.address), AMOUNT],
      );
      assert.equal(await balanceOf(token, client), AMOUNT);
      assert.equal(await balanceOf(token, treasury), 0n); // คืนเต็มจำนวน ไม่หักค่าธรรมเนียม
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Refunded,
      );
    });

    it("client ขอคืนไม่ได้ถ้า freelancer ส่งงานแล้ว แม้เลย deadline", async () => {
      const { escrow, deadline } =
        await networkHelpers.loadFixture(fundedFixture);
      await escrow.write.submitWork([projectId, idOf("work")], {
        account: freelancer.account,
      });
      await networkHelpers.time.increaseTo(deadline + 1n);

      await viem.assertions.revertWithCustomError(
        escrow.write.refundClient([projectId], { account: client.account }),
        escrow,
        "NotYetRefundable",
      );
    });

    it("freelancer ยอมคืนเงินได้ทุกเมื่อ แม้ส่งงานแล้วและยังไม่ถึง deadline", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(fundedFixture);
      await escrow.write.submitWork([projectId, idOf("work")], {
        account: freelancer.account,
      });
      await escrow.write.refundClient([projectId], {
        account: freelancer.account,
      });
      assert.equal(await balanceOf(token, client), AMOUNT);
    });

    it("คนอื่นขอคืนเงินไม่ได้", async () => {
      const { escrow, deadline } =
        await networkHelpers.loadFixture(fundedFixture);
      await networkHelpers.time.increaseTo(deadline + 1n);
      for (const who of [arbiter, owner, stranger]) {
        await viem.assertions.revertWithCustomError(
          escrow.write.refundClient([projectId], { account: who.account }),
          escrow,
          "NotAuthorized",
        );
      }
    });

    it("คืนซ้ำ / คืนหลังปล่อยเงิน / คืนตอน dispute ไม่ได้", async () => {
      const funded = await networkHelpers.loadFixture(fundedFixture);
      await funded.escrow.write.refundClient([projectId], {
        account: freelancer.account,
      });
      await viem.assertions.revertWithCustomError(
        funded.escrow.write.refundClient([projectId], {
          account: freelancer.account,
        }),
        funded.escrow,
        "InvalidStatus",
      );

      const disputed = await networkHelpers.loadFixture(disputedFixture);
      await viem.assertions.revertWithCustomError(
        disputed.escrow.write.refundClient([projectId], {
          account: freelancer.account,
        }),
        disputed.escrow,
        "InvalidStatus",
      );
    });
  });

  describe("dispute", () => {
    it("client หรือ freelancer เปิดข้อพิพาทได้ → สถานะ Disputed เงินยังอยู่ใน contract", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(fundedFixture);

      await viem.assertions.emitWithArgs(
        escrow.write.openDispute([projectId], { account: client.account }),
        escrow,
        "DisputeOpened",
        [projectId, getAddress(client.account.address)],
      );
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Disputed,
      );
      assert.equal(await token.read.balanceOf([escrow.address]), AMOUNT);
    });

    it("freelancer เปิดข้อพิพาทได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(fundedFixture);
      await viem.assertions.emitWithArgs(
        escrow.write.openDispute([projectId], { account: freelancer.account }),
        escrow,
        "DisputeOpened",
        [projectId, getAddress(freelancer.account.address)],
      );
    });

    it("คนนอกเปิดข้อพิพาทไม่ได้ และเปิดซ้ำไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(fundedFixture);
      for (const who of [arbiter, stranger]) {
        await viem.assertions.revertWithCustomError(
          escrow.write.openDispute([projectId], { account: who.account }),
          escrow,
          "NotAuthorized",
        );
      }
      await escrow.write.openDispute([projectId], { account: client.account });
      await viem.assertions.revertWithCustomError(
        escrow.write.openDispute([projectId], { account: freelancer.account }),
        escrow,
        "InvalidStatus",
      );
    });

    it("arbiter ตัดสินให้ freelancer → จ่ายพร้อมหักค่าธรรมเนียม", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(disputedFixture);

      await viem.assertions.emitWithArgs(
        escrow.write.resolveDispute([projectId, true], {
          account: arbiter.account,
        }),
        escrow,
        "DisputeResolved",
        [projectId, true],
      );
      assert.equal(await balanceOf(token, freelancer), 975n * USDC);
      assert.equal(await balanceOf(token, treasury), 25n * USDC);
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Released,
      );
    });

    it("arbiter ตัดสินให้ client → คืนเต็มจำนวน", async () => {
      const { token, escrow } = await networkHelpers.loadFixture(disputedFixture);

      await escrow.write.resolveDispute([projectId, false], {
        account: arbiter.account,
      });
      assert.equal(await balanceOf(token, client), AMOUNT);
      assert.equal(await balanceOf(token, treasury), 0n);
      assert.equal(
        (await escrow.read.getEscrow([projectId])).status,
        Status.Refunded,
      );
    });

    it("ที่ไม่ใช่ arbiter ตัดสินไม่ได้ (รวมถึง owner / client / freelancer)", async () => {
      const { escrow } = await networkHelpers.loadFixture(disputedFixture);
      for (const who of [owner, client, freelancer, stranger]) {
        await viem.assertions.revertWithCustomError(
          escrow.write.resolveDispute([projectId, true], {
            account: who.account,
          }),
          escrow,
          "NotAuthorized",
        );
      }
    });

    it("ตัดสินได้เฉพาะสถานะ Disputed และตัดสินซ้ำไม่ได้", async () => {
      const funded = await networkHelpers.loadFixture(fundedFixture);
      await viem.assertions.revertWithCustomError(
        funded.escrow.write.resolveDispute([projectId, true], {
          account: arbiter.account,
        }),
        funded.escrow,
        "InvalidStatus",
      );

      const disputed = await networkHelpers.loadFixture(disputedFixture);
      await disputed.escrow.write.resolveDispute([projectId, true], {
        account: arbiter.account,
      });
      await viem.assertions.revertWithCustomError(
        disputed.escrow.write.resolveDispute([projectId, false], {
          account: arbiter.account,
        }),
        disputed.escrow,
        "InvalidStatus",
      );
    });

    it("client ที่หายไปหลังส่งงาน: freelancer เปิด dispute แล้ว arbiter จ่ายให้ได้", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(fundedFixture);
      await escrow.write.submitWork([projectId, idOf("work")], {
        account: freelancer.account,
      });
      await networkHelpers.time.increaseTo(deadline + 1n);

      await escrow.write.openDispute([projectId], {
        account: freelancer.account,
      });
      await escrow.write.resolveDispute([projectId, true], {
        account: arbiter.account,
      });
      assert.equal(await balanceOf(token, freelancer), 975n * USDC);
    });
  });

  describe("admin", () => {
    it("owner ตั้ง fee / arbiter / feeRecipient ได้ พร้อม emit event", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.emitWithArgs(
        escrow.write.setFeeBps([500]),
        escrow,
        "FeeBpsUpdated",
        [500],
      );
      assert.equal(await escrow.read.feeBps(), 500);

      await viem.assertions.emitWithArgs(
        escrow.write.setArbiter([stranger.account.address]),
        escrow,
        "ArbiterUpdated",
        [getAddress(stranger.account.address)],
      );
      assert.equal(
        getAddress(await escrow.read.arbiter()),
        getAddress(stranger.account.address),
      );

      await viem.assertions.emitWithArgs(
        escrow.write.setFeeRecipient([stranger.account.address]),
        escrow,
        "FeeRecipientUpdated",
        [getAddress(stranger.account.address)],
      );
      assert.equal(
        getAddress(await escrow.read.feeRecipient()),
        getAddress(stranger.account.address),
      );
    });

    it("fee เกิน 10% ไม่ได้ แต่ตั้งที่ 10% พอดีได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeBps([1001]),
        escrow,
        "FeeTooHigh",
      );
      await escrow.write.setFeeBps([1000]);
      assert.equal(await escrow.read.feeBps(), 1000);
    });

    it("address 0 ไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        escrow.write.setArbiter([zeroAddress]),
        escrow,
        "InvalidAddress",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeRecipient([zeroAddress]),
        escrow,
        "InvalidAddress",
      );
    });

    it("คนที่ไม่ใช่ owner เรียกไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(deployFixture);
      const nonOwner = { account: stranger.account };
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeBps([0], nonOwner),
        escrow,
        "OwnableUnauthorizedAccount",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setArbiter([stranger.account.address], nonOwner),
        escrow,
        "OwnableUnauthorizedAccount",
      );
      await viem.assertions.revertWithCustomError(
        escrow.write.setFeeRecipient([stranger.account.address], nonOwner),
        escrow,
        "OwnableUnauthorizedAccount",
      );
    });

    it("เปลี่ยน fee ไม่กระทบ escrow ที่ฝากไว้แล้ว (snapshot) แต่กระทบ escrow ใหม่", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(fundedFixture);

      await escrow.write.setFeeBps([1000]); // 10%

      await escrow.write.releasePayment([projectId], {
        account: client.account,
      });
      // ยังคิด 2.5% ตามที่ snapshot ไว้
      assert.equal(await balanceOf(token, treasury), 25n * USDC);

      // escrow ใหม่ใช้ 10%
      const id2 = idOf("project-2");
      await token.write.mint([client.account.address, AMOUNT]);
      await token.write.approve([escrow.address, AMOUNT], {
        account: client.account,
      });
      await escrow.write.depositEscrow(
        [id2, freelancer.account.address, AMOUNT, deadline],
        { account: client.account },
      );
      await escrow.write.releasePayment([id2], { account: client.account });
      assert.equal(await balanceOf(token, treasury), 125n * USDC);
    });

    it("เปลี่ยน arbiter แล้ว arbiter เก่าตัดสินไม่ได้", async () => {
      const { escrow } = await networkHelpers.loadFixture(disputedFixture);
      await escrow.write.setArbiter([stranger.account.address]);

      await viem.assertions.revertWithCustomError(
        escrow.write.resolveDispute([projectId, true], {
          account: arbiter.account,
        }),
        escrow,
        "NotAuthorized",
      );
      await escrow.write.resolveDispute([projectId, true], {
        account: stranger.account,
      });
    });
  });

  describe("หลาย escrow พร้อมกัน", () => {
    it("แต่ละ projectId แยกกันอิสระ", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);
      const a = idOf("a");
      const b = idOf("b");
      const half = AMOUNT / 2n;

      await escrow.write.depositEscrow(
        [a, freelancer.account.address, half, deadline],
        { account: client.account },
      );
      await escrow.write.depositEscrow(
        [b, freelancer.account.address, half, deadline],
        { account: client.account },
      );

      await escrow.write.releasePayment([a], { account: client.account });
      await escrow.write.refundClient([b], { account: freelancer.account });

      assert.equal((await escrow.read.getEscrow([a])).status, Status.Released);
      assert.equal((await escrow.read.getEscrow([b])).status, Status.Refunded);
      assert.equal(await token.read.balanceOf([escrow.address]), 0n);
      assert.equal(await balanceOf(token, client), half);
    });

    it("เหรียญใน contract = ผลรวมของ escrow ที่ยังไม่จบ", async () => {
      const { token, escrow, deadline } =
        await networkHelpers.loadFixture(deployFixture);
      const a = idOf("a");
      const b = idOf("b");
      const half = AMOUNT / 2n;

      await escrow.write.depositEscrow(
        [a, freelancer.account.address, half, deadline],
        { account: client.account },
      );
      await escrow.write.depositEscrow(
        [b, freelancer.account.address, half, deadline],
        { account: client.account },
      );
      await escrow.write.releasePayment([a], { account: client.account });

      assert.equal(await token.read.balanceOf([escrow.address]), half);
    });
  });

  it("MockUSDC ใช้ 6 decimals", async () => {
    const { token } = await networkHelpers.loadFixture(deployFixture);
    assert.equal(await token.read.decimals(), 6);
    assert.equal(await token.read.symbol(), "mUSDC");
  });
});
