import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import MockUSDCModule from "./MockUSDC.js";

/**
 * Deploy ชุด demo: MockUSDC + FreelinkEscrow (arbiter และ feeRecipient = deployer โดยค่าเริ่มต้น)
 *
 * parameters: arbiter, feeRecipient, feeBps (ไม่บังคับ)
 */
export default buildModule("FreelinkDemoModule", (m) => {
  const deployer = m.getAccount(0);
  const { token } = m.useModule(MockUSDCModule);

  const arbiter = m.getParameter<string>("arbiter", deployer as never);
  const feeRecipient = m.getParameter<string>("feeRecipient", deployer as never);
  const feeBps = m.getParameter<number>("feeBps", 250);

  const escrow = m.contract("FreelinkEscrow", [
    token,
    arbiter,
    feeRecipient,
    feeBps,
  ]);

  return { token, escrow };
});
