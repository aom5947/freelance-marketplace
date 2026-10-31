import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// ใช้ทดสอบ/demo เท่านั้น — ห้าม deploy เป็นเหรียญจริง
export default buildModule("MockUSDCModule", (m) => {
  const token = m.contract("MockUSDC");
  return { token };
});
