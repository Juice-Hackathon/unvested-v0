// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import { IVesting } from "./interfaces/IVesting.sol";
import { IVestingContractWrapper } from "./interfaces/IVestingContractWrapper.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ComptrollerInterface.sol";
import "./SafeMath.sol";
import "./Exponential.sol";
import "./ErrorReporter.sol";

// Wrapper for a single vesting contract that stores tokens while user is borrowing using protocol.
// Each vesting vault must be added as enabled collateral in the Comptroller
contract VestingContractWrapper is IVestingContractWrapper, Exponential {
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

    function setOriginalRecipient() external override {
        require(msg.sender == address(comptroller), "Must be comptroller");

        vestingContract.setRecipient(originalRecipient);
    }

    /*** VIEW FUNCTIONS ***/

    function getVestedAmount() public view override returns (uint256) {
        // If not past vesting cliff then return 0 as vested
        if (block.timestamp < vestingCliff) return 0;

        if (block.timestamp >= vestingEnd) {
            return IERC20(vestingToken).balanceOf(address(vestingContract));
        } else {
            return vestingAmount.mul(block.timestamp.sub(vestingContract.lastUpdate())).div(vestingEnd.sub(vestingBegin));
        }
    }

    function getUnvestedAmount() public view override returns (uint256) {
        // If not past vesting cliff then return total vesting amount as unvested
        if (block.timestamp < vestingCliff) return vestingAmount;

        if (block.timestamp >= vestingEnd) {
            return 0;
        } else {
            // To get unvested, sub current timestamp from the vesting end
            return vestingAmount.mul(vestingEnd.sub(block.timestamp)).div(vestingEnd.sub(vestingBegin));
        }
    }

    function getNPV(uint256 phaseOneCutoff, uint256 phaseTwoCutoff, uint phaseOneDiscountMantissa, uint phaseTwoDiscountMantissa, uint phaseThreeDiscountMantissa) external view override returns(uint, uint256) {
        // Calculates NPV of vesting contract by applying time horizon discount rates
        // We split over 3 time horizons (Phase1, Phase2, Phase3)
        // PhaseOneCutoff is the block period of time for which the phaseOneDiscountMantissa is applied to
        // similar for PhaseTwo and PhaseThree

        uint oErr;
        MathError mErr;

        // If cliff not hit, no collateral is eligible yet
        if (block.timestamp < vestingCliff) return (Error.NO_ERROR,0);

        // If full amount is vested, NPV is full amount of Contract
        if (block.timestamp >= vestingEnd) return (Error.NO_ERROR, IERC20(vestingToken).balanceOf(address(vestingContract)));
        

        // Assumes no one besides comptroller calls claim() after contract is registered with comptroller
        uint256 vestedAmount = vestingAmount.mul(block.timestamp.sub(vestingContract.lastUpdate())).div(vestingEnd.sub(vestingBegin));
        uint256 unvestedAmount = getUnvestedAmount();

        uint256 timeRemaining = vestingEnd.sub(block.timestamp);

        uint phaseOneDiscount = Exp({mantissa: phaseOneDiscountMantissa});
        uint phaseTwoDiscount = Exp({mantissa: phaseTwoDiscountMantissa});
        uint phaseThreeDiscount = Exp({mantissa: phaseThreeDiscountMantissa});

        // Set presentValue to 
        uint256 presentValue = vestedAmount;

        if (timeRemaining <= phaseOneCutoff) {
            // presentValue += unvestedAmount * phaseOneDiscount
            (mErr, presentValue) = mulScalarTruncateAddUInt(phaseOneDiscount, unvestedAmount, presentValue);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0);
            }

        } else if (timeRemaining <= phaseTwoCutoff) {
            // presentValue += unvestedAmount * (PhaseOneCutoff / timeRemaining) * phaseOneDiscount
            (mErr, presentValue) = mulScalarTruncateAddUInt(phaseOneDiscount, unvestedAmount.mul(phaseOneCutoff.div(timeRemaining)), presentValue);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0);
            }

            // presentValue += (unvestedAmount * (timeRemaining - PhaseOneCutoff) / timeRemaining)) * phaseTwoDiscount
            (mErr, presentValue) = mulScalarTruncateAddUInt(phaseTwoDiscount, unvestedAmount.mul(timeRemaining.sub(phaseOneCutoff).div(timeRemaining)), presentValue);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0);
            }

        } else {
            // presentValue += unvestedAmount * (PhaseOneCutoff / timeRemaining) * phaseOneDiscount
            (mErr, presentValue) = mulScalarTruncateAddUInt(phaseOneDiscount, unvestedAmount.mul(phaseOneCutoff.div(timeRemaining)), presentValue);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0);
            }

            // presentValue += (unvestedAmount * (PhaseTwoCutoff - PhaseOneCutoff) / timeRemaining)  * phaseTwoDiscount
            (mErr, presentValue) = mulScalarTruncateAddUInt(phaseTwoDiscount, unvestedAmount.mul(phaseTwoCutoff.sub(phaseOneCutoff).div(timeRemaining)), presentValue);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0);
            }

            // presentValue += (unvestedAmount * (timeRemaining - PhaseTwoCutoff) / timeRemaining)) * phaseThreeDiscount
            (mErr, presentValue) = mulScalarTruncateAddUInt(phaseThreeDiscount, unvestedAmount.mul(timeRemaining.sub(phaseTwoCutoff).div(timeRemaining)), presentValue);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0);
            }

        }


        return (Error.NO_ERROR, presentValue);
    }
}