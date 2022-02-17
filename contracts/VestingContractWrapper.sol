// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import { IVesting } from "./interfaces/IVesting.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ComptrollerInterface.sol";
import "./SafeMath.sol";

// Wrapper for a single vesting contract that stores tokens while user is borrowing using protocol.
// Each vesting vault must be added as enabled collateral in the Comptroller
contract VestingCollateralWrapper {
    using SafeMath for uint256;

    /*** STATE ***/

    IVesting public vestingContract;
    ComptrollerInterface public comptroller;
    address public originalRecipient;

    // Store vesting contract parameters to save gas
    address public vestingToken;
    uint256 public vestingAmount;
    uint256 public vestingEnd;
    uint256 public vestingBegin;
    uint256 public vestingCliff;

    /*** CONSTRUCTOR ***/

    constructor(IVesting _vestingContract, ComptrollerInterface _comptroller) public {
        // Set state
        vestingContract = _vestingContract;
        comptroller = _comptroller;
        vestingAmount = _vestingContract.vestingAmount();
        vestingToken = _vestingContract.vestingToken();
        vestingEnd = _vestingContract.vestingEnd();
        vestingBegin = _vestingContract.vestingBegin();
        vestingCliff = _vestingContract.vestingCliff();
        originalRecipient = _vestingContract.recipient();

        // Get balance of on vesting contract
        uint256 balanceInVesting = IERC20(vestingToken).balanceOf(address(_vestingContract));

        // Get vested but unclaimed amount
        uint256 vestedAmount = getVestedAmount();

        // Get unvested amount
        uint256 unvestedAmount = getUnvestedAmount();

        // Balance of underlying must be greater than remaining as a validation. This assumes the vesting contract is immutable
        // therefore there is no possibility that a third party can remove funds and drain the balances in the vesting contract
        // after deployment
        require(vestedAmount.add(unvestedAmount) < balanceInVesting);

        // Approve max underlying tokens so Comptroller has ability to move funds from this contract
        IERC20(vestingToken).approve(address(comptroller), uint256(-1));
    }

    /*** VIEW FUNCTIONS ***/

    function getVestedAmount() public view returns (uint256) {
        // If not past vesting cliff then return 0 as vested
        if (block.timestamp < vestingCliff) return 0;

        if (block.timestamp >= vestingEnd) {
            return IERC20(vestingToken).balanceOf(address(vestingContract));
        } else {
            return vestingAmount.mul(block.timestamp.sub(vestingContract.lastUpdate())).div(vestingEnd.sub(vestingBegin));
        }
    }

    function getUnvestedAmount() public view returns (uint256) {
        // If not past vesting cliff then return total vesting amount as unvested
        if (block.timestamp < vestingCliff) return vestingAmount;

        if (block.timestamp >= vestingEnd) {
            return 0;
        } else {
            // To get unvested, sub current timestamp from the vesting end
            return vestingAmount.mul(vestingEnd.sub(block.timestamp)).div(vestingEnd.sub(vestingBegin));
        }
    }
}