// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFreelinkEscrow {
    function acceptEscrow(bytes32 escrowId, bytes32 termsHash) external;
    function submitWork(bytes32 escrowId, bytes32 workHash) external;
    function withdraw() external;
}

/// @dev ใช้ในเทสต์เท่านั้น: จำลอง freelancer ที่เป็น contract (ปฏิเสธ ETH ได้ / พยายาม re-enter ได้)
contract FreelancerMock {
    IFreelinkEscrow public immutable escrow;
    bool public acceptEth;
    bool public attack;
    bool public reentryBlocked;

    constructor(address escrow_) {
        escrow = IFreelinkEscrow(escrow_);
    }

    function setAcceptEth(bool v) external { acceptEth = v; }
    function setAttack(bool v) external { attack = v; }

    function accept(bytes32 escrowId, bytes32 termsHash) external { escrow.acceptEscrow(escrowId, termsHash); }
    function submit(bytes32 escrowId, bytes32 workHash) external { escrow.submitWork(escrowId, workHash); }
    function pull() external { escrow.withdraw(); }

    receive() external payable {
        if (attack) {
            try escrow.withdraw() {} catch { reentryBlocked = true; }
        } else {
            require(acceptEth, "no eth");
        }
    }
}
