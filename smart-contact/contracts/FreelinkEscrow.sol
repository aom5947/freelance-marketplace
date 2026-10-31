// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FreelinkEscrow
/// @notice Escrow สำหรับค่าจ้างงาน Freelance (ERC-20) — เวอร์ชัน demo/testnet ยังไม่ผ่าน audit
/// @dev หนึ่ง projectId = หนึ่ง escrow (จ่ายก้อนเดียว) ไม่รองรับ fee-on-transfer / rebasing token
contract FreelinkEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- Types ----------
    enum Status {
        Unfunded, // 0: ยังไม่มี escrow (ค่าเริ่มต้นของ mapping)
        Funded, // 1: ฝากแล้ว
        Released, // 2: จ่ายให้ freelancer แล้ว
        Refunded, // 3: คืน client แล้ว
        Disputed // 4: มีข้อพิพาท เงินยังอยู่ใน contract
    }

    struct Escrow {
        address client;
        address freelancer;
        uint256 amount;
        uint64 deadline;
        uint16 feeBps; // snapshot ตอนฝาก — การเปลี่ยน fee ภายหลังไม่กระทบ escrow ที่เปิดอยู่
        bool workSubmitted;
        Status status;
    }

    // ---------- State ----------
    IERC20 public immutable token;
    address public arbiter;
    address public feeRecipient;
    uint16 public feeBps; // 250 = 2.5%
    uint16 public constant MAX_FEE_BPS = 1000; // 10%

    mapping(bytes32 => Escrow) private escrows;

    // ---------- Errors ----------
    error NotAuthorized();
    error InvalidStatus();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidDeadline();
    error AlreadyExists();
    error NotYetRefundable();
    error FeeTooHigh();

    // ---------- Events ----------
    event EscrowFunded(
        bytes32 indexed projectId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        uint64 deadline
    );
    event WorkSubmitted(bytes32 indexed projectId, address indexed freelancer, bytes32 workHash);
    event PaymentReleased(
        bytes32 indexed projectId,
        address indexed freelancer,
        uint256 amountToFreelancer,
        uint256 fee
    );
    event EscrowRefunded(bytes32 indexed projectId, address indexed client, uint256 amount);
    event DisputeOpened(bytes32 indexed projectId, address indexed openedBy);
    event DisputeResolved(bytes32 indexed projectId, bool toFreelancer);
    event FeeBpsUpdated(uint16 newFeeBps);
    event ArbiterUpdated(address indexed newArbiter);
    event FeeRecipientUpdated(address indexed newRecipient);

    constructor(
        address token_,
        address arbiter_,
        address feeRecipient_,
        uint16 feeBps_
    ) Ownable(msg.sender) {
        if (token_ == address(0) || arbiter_ == address(0) || feeRecipient_ == address(0)) {
            revert InvalidAddress();
        }
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        token = IERC20(token_);
        arbiter = arbiter_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    // ---------- Client ----------

    /// @notice ฝากเงินเข้า escrow (client ต้อง approve token ให้ contract นี้ก่อน)
    function depositEscrow(
        bytes32 projectId,
        address freelancer,
        uint256 amount,
        uint64 deadline
    ) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (freelancer == address(0) || freelancer == msg.sender) revert InvalidAddress();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        Escrow storage e = escrows[projectId];
        if (e.client != address(0)) revert AlreadyExists();

        e.client = msg.sender;
        e.freelancer = freelancer;
        e.amount = amount;
        e.deadline = deadline;
        e.feeBps = feeBps;
        e.status = Status.Funded;

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowFunded(projectId, msg.sender, freelancer, amount, deadline);
    }

    /// @notice client ตรวจรับงานแล้วปล่อยเงินให้ freelancer
    function releasePayment(bytes32 projectId) external nonReentrant {
        Escrow storage e = escrows[projectId];
        if (msg.sender != e.client) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        _payFreelancer(projectId, e);
    }

    // ---------- Freelancer ----------

    /// @notice แจ้งว่าส่งงานแล้ว (workHash = hash ของลิงก์/ไฟล์ที่เก็บ off-chain)
    function submitWork(bytes32 projectId, bytes32 workHash) external {
        Escrow storage e = escrows[projectId];
        if (msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        e.workSubmitted = true;
        emit WorkSubmitted(projectId, msg.sender, workHash);
    }

    // ---------- Refund ----------

    /// @notice คืนเงินให้ client
    ///  - freelancer เรียกได้ทุกเมื่อ (ยอมยกเลิก)
    ///  - client เรียกได้หลัง deadline และ freelancer ยังไม่ส่งงาน
    function refundClient(bytes32 projectId) external nonReentrant {
        Escrow storage e = escrows[projectId];
        if (e.status != Status.Funded) revert InvalidStatus();

        if (msg.sender == e.freelancer) {
            // freelancer ยอมคืนเงิน
        } else if (msg.sender == e.client) {
            if (block.timestamp <= e.deadline || e.workSubmitted) revert NotYetRefundable();
        } else {
            revert NotAuthorized();
        }
        _refund(projectId, e);
    }

    // ---------- Dispute ----------

    /// @notice client หรือ freelancer เปิดข้อพิพาท (เหตุผลเก็บ off-chain ใน DB)
    function openDispute(bytes32 projectId) external {
        Escrow storage e = escrows[projectId];
        if (msg.sender != e.client && msg.sender != e.freelancer) revert NotAuthorized();
        if (e.status != Status.Funded) revert InvalidStatus();
        e.status = Status.Disputed;
        emit DisputeOpened(projectId, msg.sender);
    }

    /// @notice arbiter ตัดสิน: true = จ่าย freelancer (หักค่าธรรมเนียม), false = คืน client
    function resolveDispute(bytes32 projectId, bool toFreelancer) external nonReentrant {
        if (msg.sender != arbiter) revert NotAuthorized();
        Escrow storage e = escrows[projectId];
        if (e.status != Status.Disputed) revert InvalidStatus();

        emit DisputeResolved(projectId, toFreelancer);
        if (toFreelancer) {
            _payFreelancer(projectId, e);
        } else {
            _refund(projectId, e);
        }
    }

    // ---------- Views ----------

    function getEscrow(bytes32 projectId) external view returns (Escrow memory) {
        return escrows[projectId];
    }

    // ---------- Admin ----------

    /// @notice มีผลกับ escrow ที่ฝากหลังจากนี้เท่านั้น (escrow เดิมใช้ fee ที่ snapshot ไว้)
    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = newFeeBps;
        emit FeeBpsUpdated(newFeeBps);
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidAddress();
        arbiter = newArbiter;
        emit ArbiterUpdated(newArbiter);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    // ---------- Internal ----------

    function _payFreelancer(bytes32 projectId, Escrow storage e) private {
        e.status = Status.Released; // เปลี่ยนสถานะก่อนโอน (checks-effects-interactions)
        uint256 fee = (e.amount * e.feeBps) / 10_000;
        uint256 payout = e.amount - fee;

        token.safeTransfer(e.freelancer, payout);
        if (fee > 0) token.safeTransfer(feeRecipient, fee);

        emit PaymentReleased(projectId, e.freelancer, payout, fee);
    }

    function _refund(bytes32 projectId, Escrow storage e) private {
        e.status = Status.Refunded;
        token.safeTransfer(e.client, e.amount);
        emit EscrowRefunded(projectId, e.client, e.amount);
    }
}
