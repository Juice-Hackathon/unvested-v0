// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import "./interfaces/IVesting.sol";

abstract contract ComptrollerInterface {
    /// @notice Indicator that this is a Comptroller contract (for inspection)
    bool public constant isComptroller = true;

    /*** Assets You Are In ***/

    function registerVestingContract(address _vestingContractAddress) external virtual;
    function withdrawVestingContract(address _vestingContractAddress) external virtual;

    function enterMarkets(address[] calldata cTokens) external virtual returns (uint[] memory);
    function exitMarket(address cToken) external virtual returns (uint);

    /*** Policy Hooks ***/

    function mintAllowed(address cToken, address minter, uint mintAmount) external virtual returns (uint);
    // function mintVerify(address cToken, address minter, uint mintAmount, uint mintTokens) external virtual;

    function redeemAllowed(address cToken, address redeemer, uint redeemTokens) external virtual returns (uint);
    function redeemVerify(address cToken, address redeemer, uint redeemAmount, uint redeemTokens) external virtual;

    function borrowAllowed(address cToken, address borrower, uint borrowAmount) external virtual returns (uint);
    // function borrowVerify(address cToken, address borrower, uint borrowAmount) external virtual;

    function repayBorrowAllowed(
        address cToken,
        address payer,
        address borrower,
        uint repayAmount) external virtual returns (uint);
    // function repayBorrowVerify(
        // address cToken,
        // address payer,
        // address borrower,
        // uint repayAmount,
        // uint borrowerIndex) external virtual;

    function liquidateBorrowAllowed(
        address cTokenBorrowed,
        IVesting vestingContract,
        address liquidator,
        address borrower,
        uint repayAmount) external virtual returns (uint);
    // function liquidateBorrowVerify(
        // address cTokenBorrowed,
        // address cTokenCollateral,
        // address liquidator,
        // address borrower,
        // uint repayAmount,
        // uint seizeTokens) external virtual;

    function seizeAllowed(
        address vestingContractWrapper,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external virtual returns (uint);
    // function seizeVerify(
        // address cTokenCollateral,
        // address cTokenBorrowed,
        // address liquidator,
        // address borrower,
        // uint seizeTokens) external virtual;
    function seizeVestingTokens(
        address liquidator,
        address borrower,
        uint seizeTokens,
        IVesting vestingContract
    ) external virtual returns (uint);
    function liquidatorClaimOwedTokens(IVesting _vestingContract) external virtual;

    function transferAllowed(address cToken, address src, address dst, uint transferTokens) external virtual returns (uint);
    // function transferVerify(address cToken, address src, address dst, uint transferTokens) external virtual;

    function vestingCalculateNPV(address owner) external virtual view returns (uint, uint256);

    /*** Liquidity/Liquidation Calculations ***/

    function liquidateCalculateSeizeTokens(
        address cTokenBorrowed,
        uint repayAmount) external virtual view returns (uint, uint);

    /*** Admin ***/
    function _supportCollateralVault(address vestingContract) external virtual returns (uint);
}
