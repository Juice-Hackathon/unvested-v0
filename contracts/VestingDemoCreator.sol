// SPDX-License-Identifier: Apache License, Version 2.0
pragma solidity 0.6.10;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { Vesting } from "./Vesting.sol";
import "./ComptrollerInterface.sol";
import "./LINKMockToken.sol";

contract VestingDemoCreator {
    using SafeMath for uint256;

    ComptrollerInterface public comptroller;
    LINKMockToken public vestingToken;

    constructor(
        LINKMockToken _vestingToken,
        ComptrollerInterface _comptroller
    ) public {
        vestingToken = _vestingToken;
        comptroller = _comptroller;
    }

    function create(
        address _recipient,
        uint256 _vestingAmount,
        uint256 _vestingBegin,
        uint256 _vestingCliff,
        uint256 _vestingEnd
    ) external returns (Vesting) {
        // Deploy vesting contract
        Vesting vestingContract = new Vesting(
            address(vestingToken),
            _recipient,
            _vestingAmount,
            _vestingBegin,
            _vestingCliff,
            _vestingEnd
        );

        // Mint tokens to vesting contract. Unlimited supply tokens
        vestingToken.mint(address(vestingContract), _vestingAmount);

        // Whitelist on Comptroller. Must be whitelisted on Comptroller first
        comptroller._supportCollateralVault(address(vestingContract));

        return vestingContract;
    }
}