// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FreelinkEscrow v2
/// @notice Escrow สำหรับค่าจ้างงาน Freelance แบบ native ETH — เวอร์ชัน demo ยังไม่ผ่าน audit
/// @dev ลำดับสถานะ:
///      Funded (client ฝากแล้ว รอ freelancer ยอมรับ)
///        → Active (freelancer ยอมรับเงื่อนไขแล้ว)
///        → Submitted (ส่งงานแล้ว เริ่มนับช่วงตรวจรับ)
///        → Released | Refunded | Disputed → Resolved
///      ระหว่างช่วงตรวจรับ client ขอแก้งานได้ (requestRevision) สูงสุด maxRevisions รอบต่อ escrow:
///      Submitted → Active (freelancer มีเวลา revisionPeriod ส่งใหม่) → Submitted ...
///      client จ่าย "ค่าจ้าง + ค่าธรรมเนียม" ใน msg.value ตอนฝาก โดยระบุ amount (ค่าจ้าง) เอง
///      ถ้า msg.value ไม่เท่ากับ amount + fee ณ ขณะนั้น transaction จะ revert (ไม่เดาแทน client)
contract FreelinkEscrow is Ownable, ReentrancyGuard {
    // ---------- Types ----------
    enum Status {
        Unfunded,  // 0: ยังไม่มี escrow (ค่าเริ่มต้นของ mapping)
        Funded,    // 1: ฝากแล้ว รอ freelancer ยอมรับเงื่อนไข
        Active,    // 2: freelancer ยอมรับแล้ว กำลังทำงาน (หรือกำลังแก้งานหลัง requestRevision ดู revisionCount)
        Submitted, // 3: ส่งงานแล้ว อยู่ในช่วงตรวจรับ
        Disputed,  // 4: มีข้อพิพาท เงินรอ arbiter
        Released,  // 5: จ่ายให้ freelancer เต็มจำนวนแล้ว
        Refunded,  // 6: คืนให้ client เต็มจำนวนแล้ว
        Resolved   // 7: ปิดด้วยคำตัดสิน (arbiter หรือ timeout) ดู payoutBps
    }

    struct Escrow {
        address client;
        address freelancer;
        address arbiter;      // snapshot ตอนเปิด dispute (ก่อนหน้านั้นเป็น address(0))
        uint256 amount;       // ค่าจ้าง (wei) ที่ client ระบุตอนฝาก
        uint256 fee;          // ค่าธรรมเนียมแพลตฟอร์ม (wei) snapshot ตอนฝาก
        bytes32 termsHash;    // hash ของข้อตกลงที่เก็บ off-chain (ทั้งสองฝ่ายต้องยืนยันค่าเดียวกัน)
        uint64 deadline;      // เส้นตายส่งงาน (unix)
        uint64 reviewEndsAt;  // เวลาที่ช่วงตรวจรับสิ้นสุด (ตั้งตอนส่งงาน)
        uint64 disputedAt;    // เวลาที่เปิด dispute
        uint16 payoutBps;     // สัดส่วนค่าจ้างที่ freelancer ได้จริง (ตั้งตอนปิด escrow, 10000 = ทั้งหมด)
        uint8 revisionCount;  // จำนวนครั้งที่ client ขอแก้งานแล้ว (นับต่อ escrow ไม่รีเซ็ตเมื่อส่งซ้ำ)
        Status status;
    }

    // ---------- Constants / immutables ----------
    uint16 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 1000;           // เพดานค่าธรรมเนียม 10%
    uint64 public constant MAX_DURATION = 365 days;      // deadline ห่างจากวันฝากได้ไม่เกิน 1 ปี
    uint16 public constant TIMEOUT_FREELANCER_BPS = 5000; // arbiter เงียบเกินกำหนด → แบ่งครึ่ง
    uint8 public constant MAX_REVISION_LIMIT = 10;        // เพดานจำนวนรอบแก้งานที่ตั้งได้ตอน deploy

    uint64 public immutable reviewPeriod;    // ช่วงที่ client ตรวจรับหลังส่งงาน
    uint64 public immutable arbiterTimeout;  // เวลาที่ arbiter มีเพื่อตัดสินหลังเปิด dispute
    uint64 public immutable revisionPeriod;  // เวลาขั้นต่ำที่ freelancer มีส่งงานแก้หลัง client ขอแก้
    uint8 public immutable maxRevisions;     // จำนวนครั้งที่ขอแก้งานได้ต่อ escrow (0 = ปิดฟีเจอร์)

    // ---------- State ----------
    address public arbiter;
    address public feeRecipient;
    uint16 public feeBps; // 500 = 5% ของค่าจ้าง

    mapping(bytes32 => Escrow) private escrows;
    mapping(address => uint256) public pendingWithdrawals; // เงินที่โอนไม่สำเร็จ รอผู้รับมาเบิกเอง

    // ---------- Errors ----------
    error NotAuthorized();
    error InvalidStatus();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidDeadline();
    error InvalidDuration();
    error InvalidTerms();
    error InvalidShare();
    error InvalidLimit();
    error AlreadyExists();
    error WrongPayment(uint256 expected, uint256 sent);
    error NotYetRefundable();
    error DeadlinePassed();
    error ReviewPeriodActive();
    error ReviewPeriodOver();
    error RevisionLimitReached();
    error DisputeRequired();
    error DisputeNotExpired();
    error ConflictOfInterest();
    error FeeTooHigh();
    error TransferFailed();

    // ---------- Events ----------
    event EscrowFunded(
        bytes32 indexed escrowId,
        bytes32 indexed projectId,
        address indexed client,
        address freelancer,
        uint256 amount,
        uint256 fee,
        uint64 deadline,
        bytes32 termsHash
    );
    event EscrowAccepted(bytes32 indexed escrowId, address indexed freelancer);
    event WorkSubmitted(bytes32 indexed escrowId, address indexed freelancer, bytes32 workHash, uint64 reviewEndsAt);
    event PaymentReleased(
        bytes32 indexed escrowId,
        address indexed freelancer,
        uint256 amountToFreelancer,
        uint256 fee
    );
    event EscrowRefunded(bytes32 indexed escrowId, address indexed client, uint256 amount);
    event RevisionRequested(bytes32 indexed escrowId, uint8 revisionNumber, string reason, uint64 newDeadline);
    event DisputeOpened(bytes32 indexed escrowId, address indexed openedBy, string reason, address arbiter);
    event DisputeResolved(
        bytes32 indexed escrowId,
        uint16 freelancerBps,
        uint256 toFreelancer,
        uint256 toClient,
        uint256 feePaid,
        bool byTimeout
    );
    event PayoutDeferred(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event ArbiterUpdated(address indexed oldArbiter, address indexed newArbiter);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    constructor(
        address arbiter_,
        address feeRecipient_,
        uint16 feeBps_,
        uint64 reviewPeriod_,
        uint64 arbiterTimeout_,
        uint64 revisionPeriod_,
        uint8 maxRevisions_
    ) Ownable(msg.sender) {
        if (arbiter_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (reviewPeriod_ == 0 || reviewPeriod_ > 30 days) revert InvalidDuration();
        if (arbiterTimeout_ == 0 || arbiterTimeout_ > 90 days) revert InvalidDuration();
        if (revisionPeriod_ == 0 || revisionPeriod_ > 30 days) revert InvalidDuration();
        if (maxRevisions_ > MAX_REVISION_LIMIT) revert InvalidLimit();
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        reviewPeriod = reviewPeriod_;
        arbiterTimeout = arbiterTimeout_;
        revisionPeriod = revisionPeriod_;
        maxRevisions = maxRevisions_;
    }

    // ---------- Client ----------

    /// @notice ฝากเงินเข้า escrow — msg.value ต้องเท่ากับ amount + fee พอดี (ดู quote())
    /// @param projectId  รหัสโปรเจกต์ (keccak256 ของ project.id ฝั่ง Frontend)
    /// @param termsHash  hash ของข้อตกลง (ขอบเขตงาน/ราคา) ที่ freelancer ต้องยืนยันตอน accept
    /// @param amount     ค่าจ้างที่ freelancer จะได้รับ (wei) — ค่าธรรมเนียมบวกเพิ่มจากนี้
    /// @return escrowId  คีย์ของ escrow = keccak256(client, projectId) ใช้กับทุกฟังก์ชันที่เหลือ
    function depositEscrow(
        bytes32 projectId,
        address freelancer,
        uint64 deadline,
        bytes32 termsHash,
        uint256 amount
    ) external payable returns (bytes32 escrowId) {
        if (amount == 0) revert InvalidAmount();
        if (termsHash == bytes32(0)) revert InvalidTerms();
        if (freelancer == address(0) || freelancer == msg.sender) revert InvalidAddress();
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_DURATION) revert InvalidDeadline();
        if (arbiter == msg.sender || arbiter == freelancer) revert ConflictOfInterest();

        escrowId = computeEscrowId(msg.sender, projectId);
        Escrow storage e = escrows[escrowId];
        if (e.client != address(0)) revert AlreadyExists();

        uint256 fee = (amount * feeBps) / BPS;
        if (msg.value != amount + fee) revert WrongPayment(amount + fee, msg.value);

        e.client = msg.sender;
        e.freelancer = freelancer;
        e.amount = amount;
        e.fee = fee;
        e.termsHash = termsHash;
        e.deadline = deadline;
        e.status = Status.Funded;

        emit EscrowFunded(escrowId, projectId, msg.sender, freelancer, amount, fee, deadline, termsHash);
    }

    /// @notice client ตรวจรับงานแล้วปล่อยเงินให้ freelancer (ทำได้ทันทีที่ freelancer ยอมรับงานแล้ว)
    function releasePayment(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client) revert NotAuthorized();
        if (e.status != Status.Active && e.status != Status.Submitted) revert InvalidStatus();
        _releaseToFreelancer(escrowId, e);
    }

    /// @notice client ขอให้แก้งานที่ส่งมา (ทำได้เฉพาะตอน Submitted และภายในช่วงตรวจรับ)
    ///         สถานะกลับเป็น Active และ deadline ถูกขยายอย่างน้อย revisionPeriod นับจากตอนนี้
    ///         deadline ใหม่ถูกกำหนดโดย contract (client ตั้งเองไม่ได้ กันตั้งสั้นแล้วรอขอเงินคืน)
    ///         ขอได้สูงสุด maxRevisions ครั้งต่อ escrow เกินแล้วต้องปล่อยเงินหรือเปิด dispute
    function requestRevision(bytes32 escrowId, string calldata reason) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client) revert NotAuthorized();
        if (e.status != Status.Submitted) revert InvalidStatus();
        if (block.timestamp > e.reviewEndsAt) revert ReviewPeriodOver();
        if (e.revisionCount >= maxRevisions) revert RevisionLimitReached();

        e.revisionCount += 1;
        e.status = Status.Active;
        e.reviewEndsAt = 0;
        uint64 minDeadline = uint64(block.timestamp) + revisionPeriod;
        if (e.deadline < minDeadline) e.deadline = minDeadline;

        emit RevisionRequested(escrowId, e.revisionCount, reason, e.deadline);
    }

    // ---------- Freelancer ----------

    /// @notice ยอมรับงาน — ต้องส่ง termsHash เดียวกับที่ client ผูกไว้ตอนฝาก เพื่อยืนยันว่าเห็นเงื่อนไขเดียวกัน
    function acceptEscrow(bytes32 escrowId, bytes32 termsHash) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        if (termsHash != e.termsHash) revert InvalidTerms();
        if (block.timestamp >= e.deadline) revert DeadlinePassed();
        e.status = Status.Active;
        emit EscrowAccepted(escrowId, msg.sender);
    }

    /// @notice แจ้งว่าส่งงานแล้ว (workHash = hash ของลิงก์/ไฟล์ off-chain) ต้องส่งก่อน deadline
    ///         เริ่มนับช่วงตรวจรับ: client ต้องปล่อยเงินหรือเปิด dispute ภายใน reviewPeriod
    function submitWork(bytes32 escrowId, bytes32 workHash) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Active) revert InvalidStatus();
        if (block.timestamp > e.deadline) revert DeadlinePassed();
        e.status = Status.Submitted;
        e.reviewEndsAt = uint64(block.timestamp) + reviewPeriod;
        emit WorkSubmitted(escrowId, msg.sender, workHash, e.reviewEndsAt);
    }

    /// @notice client เงียบหลังส่งงานจนพ้นช่วงตรวจรับ → freelancer เบิกเงินเองได้
    function claimAfterReview(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Submitted) revert InvalidStatus();
        if (block.timestamp <= e.reviewEndsAt) revert ReviewPeriodActive();
        _releaseToFreelancer(escrowId, e);
    }

    // ---------- Refund ----------

    /// @notice คืนเงินให้ client เต็มจำนวนรวมค่าธรรมเนียม
    ///  - ยังไม่ accept (Funded): client หรือ freelancer เรียกได้ทุกเมื่อ (ยกเลิก / ปฏิเสธรับงาน)
    ///  - freelancer เรียกได้ทุกเมื่อก่อนจบงาน (ยอมยกเลิก)
    ///  - client เรียกได้หลัง deadline ถ้ายังทำงานอยู่ (Active) และไม่เคยส่งงาน — หลังส่งงานแล้ว
    ///    (รวมถึงระหว่างแก้งาน) ต้องใช้ openDispute
    function refundClient(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        Status s = e.status;
        if (s != Status.Funded && s != Status.Active && s != Status.Submitted) revert InvalidStatus();

        if (msg.sender == e.freelancer) {
            // ok
        } else if (msg.sender == e.client) {
            if (s == Status.Submitted) revert InvalidStatus();
            // เคยส่งงานแล้ว (อยู่ระหว่างแก้งาน) → ขอเงินคืนเองไม่ได้ ต้องเปิด dispute ให้ arbiter ตัดสิน
            if (s == Status.Active && e.revisionCount > 0) revert DisputeRequired();
            if (s == Status.Active && block.timestamp <= e.deadline) revert NotYetRefundable();
        } else {
            revert NotAuthorized();
        }

        (, uint256 toClient, ) = _settle(e, 0, Status.Refunded);
        emit EscrowRefunded(escrowId, e.client, toClient);
    }

    // ---------- Dispute ----------

    /// @notice เปิดข้อพิพาท (reason เป็นข้อความสั้นๆ ที่ปรากฏใน event ถาวร อย่าใส่ข้อมูลส่วนตัว)
    ///  - client: ตอน Active หรือตอน Submitted ภายในช่วงตรวจรับ (นี่คือการ "ปฏิเสธงาน")
    ///  - freelancer: ตอน Active และก่อน deadline เท่านั้น (กันไม่ให้ขวางสิทธิ์คืนเงินของ client หลัง deadline)
    ///  arbiter ถูก snapshot ณ ตอนเปิด ไม่ถูกเปลี่ยนกลางคันโดย owner
    function openDispute(bytes32 escrowId, string calldata reason) external {
        Escrow storage e = escrows[escrowId];
        Status s = e.status;

        if (msg.sender == e.client) {
            if (s == Status.Submitted) {
                if (block.timestamp > e.reviewEndsAt) revert ReviewPeriodOver();
            } else if (s != Status.Active) {
                revert InvalidStatus();
            }
        } else if (msg.sender == e.freelancer) {
            if (s != Status.Active) revert InvalidStatus();
            if (block.timestamp > e.deadline) revert DeadlinePassed();
        } else {
            revert NotAuthorized();
        }

        address a = arbiter;
        if (a == e.client || a == e.freelancer) revert ConflictOfInterest();

        e.arbiter = a;
        e.status = Status.Disputed;
        e.disputedAt = uint64(block.timestamp);
        emit DisputeOpened(escrowId, msg.sender, reason, a);
    }

    /// @notice arbiter ตัดสิน: freelancerBps = สัดส่วนค่าจ้างที่ freelancer ได้ (0–10000)
    ///         ค่าธรรมเนียมคิดตามสัดส่วนเดียวกัน ส่วนที่เหลือทั้งหมดคืน client
    function resolveDispute(bytes32 escrowId, uint16 freelancerBps) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (e.status != Status.Disputed) revert InvalidStatus();
        if (msg.sender != e.arbiter) revert NotAuthorized();
        if (freelancerBps > BPS) revert InvalidShare();
        _resolve(escrowId, e, freelancerBps, false);
    }

    /// @notice arbiter เงียบเกิน arbiterTimeout → คู่กรณีฝ่ายใดก็ได้สั่งแบ่งครึ่งเพื่อไม่ให้เงินค้างตลอดไป
    function settleExpiredDispute(bytes32 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.client && msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Disputed) revert InvalidStatus();
        if (block.timestamp <= uint256(e.disputedAt) + arbiterTimeout) revert DisputeNotExpired();
        _resolve(escrowId, e, TIMEOUT_FREELANCER_BPS, true);
    }

    // ---------- Pull payment (fallback) ----------

    /// @notice เบิกเงินที่โอนให้ไม่สำเร็จตอนปิด escrow (เช่น ผู้รับเป็น contract ที่ปฏิเสธ ETH)
    function withdraw() external nonReentrant {
        uint256 value = pendingWithdrawals[msg.sender];
        if (value == 0) revert InvalidAmount();
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: value}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, value);
    }

    // ---------- Views ----------

    function computeEscrowId(address client, bytes32 projectId) public pure returns (bytes32) {
        return keccak256(abi.encode(client, projectId));
    }

    /// @notice คำนวณค่าธรรมเนียมและยอดรวมที่ต้องแนบ (ใช้สูตรเดียวกับ depositEscrow)
    function quote(uint256 amount) external view returns (uint256 fee, uint256 total) {
        fee = (amount * feeBps) / BPS;
        total = amount + fee;
    }

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    // ---------- Admin ----------

    /// @notice เปลี่ยนค่าธรรมเนียม — มีผลเฉพาะ escrow ที่ฝากหลังจากนี้ (escrow เดิมใช้ค่า snapshot)
    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeBpsUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    /// @notice เปลี่ยน arbiter — มีผลเฉพาะ dispute ที่เปิดหลังจากนี้
    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidAddress();
        emit ArbiterUpdated(arbiter, newArbiter);
        arbiter = newArbiter;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // ---------- Internal ----------

    function _releaseToFreelancer(bytes32 escrowId, Escrow storage e) private {
        (uint256 toFreelancer, , uint256 feePaid) = _settle(e, BPS, Status.Released);
        emit PaymentReleased(escrowId, e.freelancer, toFreelancer, feePaid);
    }

    function _resolve(bytes32 escrowId, Escrow storage e, uint16 freelancerBps, bool byTimeout) private {
        (uint256 toFreelancer, uint256 toClient, uint256 feePaid) = _settle(e, freelancerBps, Status.Resolved);
        emit DisputeResolved(escrowId, freelancerBps, toFreelancer, toClient, feePaid, byTimeout);
    }

    /// @dev แบ่งเงินทั้งหมดของ escrow ตามสัดส่วน freelancerBps ของค่าจ้าง
    ///      (ค่าธรรมเนียมแพลตฟอร์มคิดตามสัดส่วนเดียวกัน ส่วนที่เหลือเป็นของ client ไม่มีเศษหาย)
    ///      เปลี่ยนสถานะก่อนโอนเงิน (checks-effects-interactions)
    function _settle(
        Escrow storage e,
        uint16 freelancerBps,
        Status finalStatus
    ) private returns (uint256 toFreelancer, uint256 toClient, uint256 feePaid) {
        e.status = finalStatus;
        e.payoutBps = freelancerBps;

        toFreelancer = (e.amount * freelancerBps) / BPS;
        feePaid = (e.fee * freelancerBps) / BPS;
        toClient = e.amount + e.fee - toFreelancer - feePaid;

        if (toFreelancer > 0) _send(e.freelancer, toFreelancer);
        if (feePaid > 0) _send(feeRecipient, feePaid);
        if (toClient > 0) _send(e.client, toClient);
    }

    /// @dev ถ้าโอนไม่สำเร็จ (ผู้รับปฏิเสธ ETH) จะบันทึกเป็นยอดค้างให้มาเบิกเอง แทนที่จะ revert
    ///      เพื่อไม่ให้ผู้รับฝ่ายหนึ่งขวางเงินของอีกฝ่าย
    function _send(address to, uint256 value) private {
        (bool ok, ) = to.call{value: value}("");
        if (!ok) {
            pendingWithdrawals[to] += value;
            emit PayoutDeferred(to, value);
        }
    }
}
