// SPDX-License-Identifier: Apache License, Version 2.0
pragma solidity 0.6.10;

interface IVesting {
    function recipient() external view returns(address);
    function vestingToken() external view returns(address);
    function vestingAmount() external view returns(uint256);
    function vestingBegin() external view returns(uint256);
    function vestingCliff() external view returns(uint256);
    function vestingEnd() external view returns(uint256);
    function lastUpdate() external view returns(uint256);

    function setRecipient(address recipient_) external;
    function claim() external;
}