// SPDX-License-Identifier: Apache License, Version 2.0
pragma solidity 0.6.10;

import "./IVesting.sol";

interface IVestingCollateralWrapper {
    function getVestedAmount() external view returns(uint256);
    function getUnvestedAmount() external view returns(uint256);
    function vestingContract() external view returns(IVesting);
    function originalRecipient() external view returns(address);
    function vestingToken() external view returns(address);

    function register() external;
    function withdraw() external;
}