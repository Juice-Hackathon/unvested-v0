// SPDX-License-Identifier: Apache License, Version 2.0
pragma solidity 0.6.10;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { Vesting } from "./Vesting.sol";
import "./ComptrollerInterface.sol";
import "./LINKMockToken.sol";

contract VestingDemoCreator {
    using SafeMath for uint256;

    uint256 ONE_YEAR_IN_SECONDS = 31557600;

    ComptrollerInterface public immutable comptroller;
    LINKMockToken public immutable vestingToken;
    uint256 public immutable defaultVestingAmount;
    mapping(address => address) public userToVestingContract;

    constructor(
        LINKMockToken _vestingToken,
        ComptrollerInterface _comptroller,
        uint256 _defaultVestingAmount
    ) public {
        vestingToken = _vestingToken;
        comptroller = _comptroller;
        defaultVestingAmount = _defaultVestingAmount;
    }

    function create(address _recipient) external returns (Vesting) {
        // Deploy vesting contract
        Vesting vestingContract = new Vesting(
            address(vestingToken),
            _recipient,
            defaultVestingAmount,
            block.timestamp,                                    // Start vesting at time of deployment
            block.timestamp,                                    // No cliff
            block.timestamp.add(ONE_YEAR_IN_SECONDS.mul(2))     // 2 year vesting schedule
        );

        // Mint tokens to vesting contract. Unlimited supply tokens
        vestingToken.mint(address(vestingContract), defaultVestingAmount);
        
        // Track created vesting contract in mapping for UI
        userToVestingContract[msg.sender] = address(vestingContract);

        // Whitelist on Comptroller. Must be whitelisted on Comptroller first
        comptroller._supportCollateralVault(address(vestingContract));

        return vestingContract;
    }
}