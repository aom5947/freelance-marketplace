import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploy FreelinkEscrow กับ ERC-20 ที่มีอยู่แล้ว
 *
 * parameters (ส่งผ่าน --parameters <file.json>):
 *   tokenAddress  (จำเป็น)  address ของ ERC-20
 *   arbiter       (ไม่ระบุ = deployer)
 *   feeRecipient  (ไม่ระบุ = deployer)
 *   feeBps        (ไม่ระบุ = 250 → 2.5%)
 */
export default buildModule("FreelinkEscrowModule", (m) => {
  const deployer = m.getAccount(0);

  const tokenAddress = m.getParameter<string>("tokenAddress");
  const arbiter = m.getParameter<string>("arbiter", deployer as never);
  const feeRecipient = m.getParameter<string>("feeRecipient", deployer as never);
  const feeBps = m.getParameter<number>("feeBps", 250);

  const escrow = m.contract("FreelinkEscrow", [
    tokenAddress,
    arbiter,
    feeRecipient,
    feeBps,
  ]);

  return { escrow };
});
