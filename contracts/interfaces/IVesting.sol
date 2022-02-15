// SPDX-License-Identifier: Apache License, Version 2.0
pragma solidity ^0.5.16;

interface IVesting {
    function recipient() external;
    function vestingAmount() external;
    function vestingBegin() external;
    function vestingCliff() external;
    function vestingEnd() external;
    function lastUpdate() external;

    function setRecipient(address recipient_) external;
    function claim() external;
}