// SPDX-License-Identifier: Apache License, Version 2.0
pragma solidity 0.6.10;

import "./IVesting.sol";

interface IVestingContractWrapper {
    function getVestedUnclaimedAmount() external view returns(uint256);
    function getLiquidAmount() external view returns(uint256);
    function getUnvestedAmount() external view returns(uint256);
    function vestingContract() external view returns(IVesting);
    function originalRecipient() external view returns(address);
    function vestingToken() external view returns(address);
    function getNPV(uint256 phaseOneCutoff, uint256 phaseTwoCutoff, uint phaseOneDiscountMantissa, uint phaseTwoDiscountMantissa, uint phaseThreeDiscountMantissa) external view returns(uint, uint256);

    function setOriginalRecipient() external;
}