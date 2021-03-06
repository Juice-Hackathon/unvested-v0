// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import "./CToken.sol";
import "./ErrorReporter.sol";
import "./Exponential.sol";
import "./PriceOracle.sol";
import "./ComptrollerInterface.sol";
import "./ComptrollerStorage.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IVesting } from "./interfaces/IVesting.sol";
import { VestingContractWrapper } from "./VestingContractWrapper.sol";
import { IVestingContractWrapper } from "./interfaces/IVestingContractWrapper.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title Compound's Comptroller Contract
 * @dev This was the first version of the Comptroller brains.
 *  We keep it so our tests can continue to do the real-life behavior of upgrading from this logic forward.
 */
contract Comptroller is ComptrollerV1Storage, ComptrollerInterface, ComptrollerErrorReporter, Exponential, ReentrancyGuard {
    using SafeMath for uint256;

    struct Market {
        // Whether or not this market is listed
        bool isListed;

        // Multiplier representing the most one can borrow against their collateral in this market.
        // For instance, 0.9 to allow borrowing 90% of collateral value.
        // Must be between 0 and 1, and stored as a mantissa.
        uint collateralFactorMantissa;

        // Per-market mapping of "accounts in this asset"
        mapping(address => bool) accountMembership;
    }

    // Paramters for calculating NPV of Collateral for single Market
    // set with admin function _setVestingNPVConfig
    struct VestingNPVConfig {
        address underlyingAddress;
        uint phaseOneDiscountMantissa;
        uint phaseTwoDiscountMantissa;
        uint phaseThreeDiscountMantissa;
        uint256 phaseOneCutoff;
        uint256 phaseTwoCutoff;
        uint collateralFactorMantissa;
    }

    VestingNPVConfig public vestingNPVConfig; //instantiating VestingNPVConfig


    struct VestingContractInfo {
        // Whether or not this vesting contract is listed
        bool isListed;
        bool enabledAsCollateral;
        address vestingContractWrapper;
        address unvestedTokenLiquidator;
        uint256 amountOwedToLiquidator;
    }

    /**
     * @notice Official mapping of cTokens -> Market metadata
     * @dev Used e.g. to determine if a market is supported
     */
    mapping(address => Market) public markets;
    mapping(IVesting => VestingContractInfo) public vestingContractInfo;

    // Mapping of account to vesting contract
    mapping(address => IVesting) public accountToVesting;

    // /**
    //  * @notice Emitted when an admin supports a market
    //  */
    // event MarketListed(CToken cToken);

    // /**
    //  * @notice Emitted when an account enters a market
    //  */
    // event MarketEntered(CToken cToken, address account);

    // /**
    //  * @notice Emitted when an account exits a market
    //  */
    // event MarketExited(CToken cToken, address account);

    // /**
    //  * @notice Emitted when close factor is changed by admin
    //  */
    // event NewCloseFactor(uint oldCloseFactorMantissa, uint newCloseFactorMantissa);

    // *
    //  * @notice Emitted when a collateral factor is changed by admin
     
    // event NewCollateralFactor(CToken cToken, uint oldCollateralFactorMantissa, uint newCollateralFactorMantissa);

    // /**
    //  * @notice Emitted when liquidation incentive is changed by admin
    //  */
    // event NewLiquidationIncentive(uint oldLiquidationIncentiveMantissa, uint newLiquidationIncentiveMantissa);

    // /**
    //  * @notice Emitted when maxAssets is changed by admin
    //  */
    // event NewMaxAssets(uint oldMaxAssets, uint newMaxAssets);

    // /**
    //  * @notice Emitted when price oracle is changed
    //  */
    // event NewPriceOracle(PriceOracle oldPriceOracle, PriceOracle newPriceOracle);

    // closeFactorMantissa must be strictly greater than this value
    uint constant closeFactorMinMantissa = 5e16; // 0.05

    // closeFactorMantissa must not exceed this value
    uint constant closeFactorMaxMantissa = 9e17; // 0.9

    // No collateralFactorMantissa may exceed this value
    uint constant collateralFactorMaxMantissa = 9e17; // 0.9

    // liquidationIncentiveMantissa must be no less than this value
    uint constant liquidationIncentiveMinMantissa = mantissaOne;

    // liquidationIncentiveMantissa must be no greater than this value
    uint constant liquidationIncentiveMaxMantissa = 15e17; // 1.5

    constructor() public {
        admin = msg.sender;

        allowedCaller[msg.sender] = true;
    }

    /*** Assets You Are In ***/

    /**
     * @notice Returns the assets an account has entered
     * @param account The address of the account to pull assets for
     * @return A dynamic list with the assets the account has entered
     */
    function getAssetsIn(address account) external view returns (CToken[] memory) {
        CToken[] memory assetsIn = accountAssets[account];

        return assetsIn;
    }

    /**
     * @notice Returns whether the given account is entered in the given asset
     * @param account The address of the account to check
     * @param cToken The cToken to check
     * @return True if the account is in the asset, otherwise false.
     */
    function checkMembership(address account, CToken cToken) external view returns (bool) {
        return markets[address(cToken)].accountMembership[account];
    }

    /**
     * @notice Registers vesting contract. Validates the recipient is the vault contract and then sets enabled as collateral to true
     */
    function registerVestingContract(address _vestingContractAddress) external override {
        IVesting _vestingContract = IVesting(_vestingContractAddress);
        
        // Require only one vesting contract per account
        require(accountToVesting[msg.sender] == IVesting(0), "Already registered a vesting contract");

        // Require collateral is listed
        require(vestingContractInfo[_vestingContract].isListed, "Must be listed");

        // Require collateral is not enabled yet
        require(!vestingContractInfo[_vestingContract].enabledAsCollateral, "Must not be enabled");

        // Validate that the recipient of the vesting contract is this Comptroller
        require(_vestingContract.recipient() == address(this) , "Recipient must be Comptroller");

        // Validate original recipient is caller. This assumes that vestingContractWrapper is already deployed in _supportCollateralVault
        require(
            IVestingContractWrapper(vestingContractInfo[_vestingContract].vestingContractWrapper).originalRecipient() == msg.sender,
            "Original recipient must be caller"
        );

        // Enable collateral for user in the Comptroller
        vestingContractInfo[_vestingContract].enabledAsCollateral = true;
        accountToVesting[msg.sender] = _vestingContract;

        // Set recipient from this to vesting contract wrapper
        _vestingContract.setRecipient(vestingContractInfo[_vestingContract].vestingContractWrapper);
    }

    function withdrawVestingContract(address _vestingContractAddress) external override {
        IVesting _vestingContract = IVesting(_vestingContractAddress);
        // Validate that the recipient of the vesting contract has been set by the owner
        address originalRecipient = IVestingContractWrapper(vestingContractInfo[_vestingContract].vestingContractWrapper).originalRecipient();
        require(_vestingContract.recipient() == vestingContractInfo[_vestingContract].vestingContractWrapper, "Please set recipient to vault contract");
        require(originalRecipient == msg.sender , "Original recipient must be caller");

        // Validate all debt is repaid to withdraw contract
        CToken[] memory assets = accountAssets[msg.sender];
        for (uint i = 0; i < assets.length; i++) {
            CToken asset = assets[i];

            // Read the balances and exchange rate from the cToken
            ( , , uint256 borrowBalance, ) = asset.getAccountSnapshot(msg.sender);
            require(borrowBalance == 0, "Must pay off debt");
        }

        // Validate that there is no pending liquidator owed tokens
        require(vestingContractInfo[_vestingContract].amountOwedToLiquidator == 0, "Amount owed to previous liquidator");

        // Set enabled collateral to false and delete account to vault mapping
        delete vestingContractInfo[_vestingContract].enabledAsCollateral;
        delete accountToVesting[msg.sender];

        // Transfer recipient back from wrapper to original recipient
        IVestingContractWrapper(vestingContractInfo[_vestingContract].vestingContractWrapper).setOriginalRecipient();

        // Transfer existing balance of tokens FROM vesting vault TO original recipient in case tokens were claimed to user
        IERC20 vestingToken = IERC20(_vestingContract.vestingToken());
        uint256 balance = vestingToken.balanceOf(vestingContractInfo[_vestingContract].vestingContractWrapper);
        vestingToken.transferFrom(
            vestingContractInfo[_vestingContract].vestingContractWrapper,
            originalRecipient,
            balance
        );
    }
    
    // IMPORTANT: Only used to enter the lending token market so borrower can execute borrows
    // The collateral vesting contract will be tracked separately. In this case, there will only be one USDC cToken allowed
    function enterMarkets(address[] memory cTokens) public override returns (uint[] memory) {
        uint len = cTokens.length;

        uint[] memory results = new uint[](len);
        for (uint i = 0; i < len; i++) {
            CToken cToken = CToken(cTokens[i]);
            Market storage marketToJoin = markets[address(cToken)];

            if (!marketToJoin.isListed) {
                // if market is not listed, cannot join move along
                results[i] = uint(Error.MARKET_NOT_LISTED);
                continue;
            }

            if (marketToJoin.accountMembership[msg.sender] == true) {
                // if already joined, move along
                results[i] = uint(Error.NO_ERROR);
                continue;
            }

            if (accountAssets[msg.sender].length >= maxAssets)  {
                // if no space, cannot join, move along
                results[i] = uint(Error.TOO_MANY_ASSETS);
                continue;
            }

            // survived the gauntlet, add to list
            // NOTE: we store these somewhat redundantly as a significant optimization
            //  this avoids having to iterate through the list for the most common use cases
            //  that is, only when we need to perform liquidity checks
            //   and not whenever we want to check if an account is in a particular market
            marketToJoin.accountMembership[msg.sender] = true;
            accountAssets[msg.sender].push(cToken);

            results[i] = uint(Error.NO_ERROR);
        }

        return results;
    }

    /**
     * @notice Removes asset from sender's account liquidity calculation
     * @dev Sender must not have an outstanding borrow balance in the asset,
     *  or be providing neccessary collateral for an outstanding borrow.
     * @param cTokenAddress The address of the asset to be removed
     * @return Whether or not the account successfully exited the market
     */
    function exitMarket(address cTokenAddress) external override returns (uint) {
        CToken cToken = CToken(cTokenAddress);
        /* Get sender tokensHeld and amountOwed underlying from the cToken */
        (uint oErr, uint tokensHeld, uint amountOwed, ) = cToken.getAccountSnapshot(msg.sender);
        require(oErr == 0, "exitMarket: getAccountSnapshot failed"); // semi-opaque error code

        /* Fail if the sender has a borrow balance */
        if (amountOwed != 0) {
            return fail(Error.NONZERO_BORROW_BALANCE, FailureInfo.EXIT_MARKET_BALANCE_OWED);
        }

        /* Fail if the sender is not permitted to redeem all of their tokens */
        uint allowed = redeemAllowedInternal(cTokenAddress, msg.sender, tokensHeld);
        if (allowed != 0) {
            return failOpaque(Error.REJECTION, FailureInfo.EXIT_MARKET_REJECTION, allowed);
        }

        Market storage marketToExit = markets[address(cToken)];

        /* Return true if the sender is not already ???in??? the market */
        if (!marketToExit.accountMembership[msg.sender]) {
            return uint(Error.NO_ERROR);
        }

        /* Set cToken account membership to false */
        delete marketToExit.accountMembership[msg.sender];

        /* Delete cToken from the account???s list of assets */
        // load into memory for faster iteration
        CToken[] memory userAssetList = accountAssets[msg.sender];
        uint len = userAssetList.length;
        uint assetIndex = len;
        for (uint i = 0; i < len; i++) {
            if (userAssetList[i] == cToken) {
                assetIndex = i;
                break;
            }
        }

        // We *must* have found the asset in the list or our redundant data structure is broken
        assert(assetIndex < len);

        // copy last item in list to location of item to be removed, reduce length by 1
        CToken[] storage storedList = accountAssets[msg.sender];
        storedList[assetIndex] = storedList[storedList.length - 1];
        storedList.pop();


        return uint(Error.NO_ERROR);
    }

    function seizeVestingTokens(address _liquidator, address _borrower, uint _seizeTokens, IVesting _vestingContract) external override nonReentrant returns (uint) {
        // msg.sender is the cToken
        uint allowed = seizeAllowed(
            vestingContractInfo[_vestingContract].vestingContractWrapper,
            msg.sender,
            _liquidator,
            _borrower,
            _seizeTokens
        );
        require(allowed == 0, "Not allowed");
        // We only allow one liquidator at a time for unvested for simplicity. Otherwise liquidators can overwrite each other's owed tokens when 
        // liquidating unvested tokens
        require(vestingContractInfo[_vestingContract].amountOwedToLiquidator == 0, "Amount owed to previous liquidator");
        require(_borrower != _liquidator, "Borrower is _liquidator");

        // Call claim to ensure vested but unclaimed tokens are liquid in this vesting contract wrapper
        _vestingContract.claim();
        
        // If seized tokens is less than liquid amount, then transfer seize tokens to _liquidator
        uint256 currentLiquidBalance = IERC20(_vestingContract.vestingToken()).balanceOf(vestingContractInfo[_vestingContract].vestingContractWrapper);
        if (_seizeTokens <= currentLiquidBalance) {
            IERC20(_vestingContract.vestingToken()).transferFrom(
                vestingContractInfo[_vestingContract].vestingContractWrapper,
                _liquidator,
                _seizeTokens
            );
            console.log("To Transfer", _seizeTokens);
        } else {
            console.log("In unvested");

            IERC20(_vestingContract.vestingToken()).transferFrom(
                vestingContractInfo[_vestingContract].vestingContractWrapper,
                _liquidator,
                currentLiquidBalance
            );

            // For this version we will not apply future value of seized tokens owed to liquidator. THis can be done by creating a 
            // future value of remaining seize tokens and setting it as owed to liquidator. Then need to update get account liquidity
            // buy applying a NPV *including* amountOwedToLiquidator
            vestingContractInfo[_vestingContract].unvestedTokenLiquidator = _liquidator;
            vestingContractInfo[_vestingContract].amountOwedToLiquidator = _seizeTokens.sub(currentLiquidBalance);
        }

        return uint(Error.NO_ERROR);
    }

    function liquidatorClaimOwedTokens(IVesting _vestingContract) external override nonReentrant {
        require(msg.sender == vestingContractInfo[_vestingContract].unvestedTokenLiquidator);
        
        _vestingContract.claim();
        uint256 currentLiquidBalance = IERC20(_vestingContract.vestingToken()).balanceOf(vestingContractInfo[_vestingContract].vestingContractWrapper);
        // If owed amount is less than liquid, transfer owed amount and reset state
        if (vestingContractInfo[_vestingContract].amountOwedToLiquidator <= currentLiquidBalance) {        
            IERC20(_vestingContract.vestingToken()).transferFrom(
                vestingContractInfo[_vestingContract].vestingContractWrapper,
                msg.sender,
                vestingContractInfo[_vestingContract].amountOwedToLiquidator
            );

            delete vestingContractInfo[_vestingContract].amountOwedToLiquidator;
            delete vestingContractInfo[_vestingContract].unvestedTokenLiquidator;
        } else {
            IERC20(_vestingContract.vestingToken()).transferFrom(
                vestingContractInfo[_vestingContract].vestingContractWrapper,
                msg.sender,
                currentLiquidBalance
            );

            // Sub liquid tokens transferred back
            vestingContractInfo[_vestingContract].amountOwedToLiquidator = vestingContractInfo[_vestingContract].amountOwedToLiquidator.sub(currentLiquidBalance);
        }
    }

    /*** Policy Hooks ***/

    /**
     * @notice Checks if the account should be allowed to mint tokens in the given market
     * @param cToken The market to verify the mint against
     * @param minter The account which would get the minted tokens
     * @param mintAmount The amount of underlying being supplied to the market in exchange for tokens
     * @return 0 if the mint is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function mintAllowed(address cToken, address minter, uint mintAmount) external override returns (uint) {
        minter;       // currently unused
        mintAmount;   // currently unused

        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // *may include Policy Hook-type checks

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates mint and reverts on rejection.
     * @param cToken Asset being minted
     * @param minter The address minting the tokens
     * @param mintAmount The amount of the underlying asset being minted
     * @param mintTokens The number of tokens being minted
     */
    // function mintVerify(address cToken, address minter, uint mintAmount, uint mintTokens) external override {
    //     cToken;       // currently unused
    //     minter;       // currently unused
    //     mintAmount;   // currently unused
    //     mintTokens;   // currently unused

    //     if (false) {
    //         maxAssets = maxAssets; // not pure
    //     }
    // }

    /**
     * @notice Checks if the account should be allowed to redeem tokens in the given market
     * @param cToken The market to verify the redeem against
     * @param redeemer The account which would redeem the tokens
     * @param redeemTokens The number of cTokens to exchange for the underlying asset in the market
     * @return 0 if the redeem is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function redeemAllowed(address cToken, address redeemer, uint redeemTokens) external override returns (uint) {
        return redeemAllowedInternal(cToken, redeemer, redeemTokens);
    }

    function redeemAllowedInternal(address cToken, address redeemer, uint redeemTokens) internal view returns (uint) {
        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // *may include Policy Hook-type checks

        /* If the redeemer is not 'in' the market, then we can bypass the liquidity check */
        if (!markets[cToken].accountMembership[redeemer]) {
            return uint(Error.NO_ERROR);
        }

        /* Otherwise, perform a hypothetical liquidity check to guard against shortfall */
        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(redeemer, CToken(cToken), redeemTokens, 0);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall > 0) {
            return uint(Error.INSUFFICIENT_LIQUIDITY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates redeem and reverts on rejection.
     * @param cToken Asset being redeemed
     * @param redeemer The address redeeming the tokens
     * @param redeemAmount The amount of the underlying asset being redeemed
     * @param redeemTokens The number of tokens being redeemed
     */
    function redeemVerify(address cToken, address redeemer, uint redeemAmount, uint redeemTokens) external override {
        cToken;         // currently unused
        redeemer;       // currently unused
        redeemAmount;   // currently unused
        redeemTokens;   // currently unused

        // Require tokens is zero or amount is also zero
        if (redeemTokens == 0 && redeemAmount > 0) {
            revert("redeemTokens zero");
        }
    }

    /**
     * @notice Checks if the account should be allowed to borrow the underlying asset of the given market
     * @param cToken The market to verify the borrow against
     * @param borrower The account which would borrow the asset
     * @param borrowAmount The amount of underlying the account would borrow
     * @return 0 if the borrow is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function borrowAllowed(address cToken, address borrower, uint borrowAmount) external override returns (uint) {

        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // *may include Policy Hook-type checks

        if (!markets[cToken].accountMembership[borrower]) {
            return uint(Error.MARKET_NOT_ENTERED);
        }

        // Require borrower enabled collateral
        require(vestingContractInfo[accountToVesting[borrower]].enabledAsCollateral, "Not enabled as collateral");

        if (oracle.getUnderlyingPrice(CToken(cToken)) == 0) {
            return uint(Error.PRICE_ERROR);
        }

        (Error err, , uint shortfall) = getHypotheticalAccountLiquidityInternal(borrower, CToken(cToken), 0, borrowAmount);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall > 0) {
            return uint(Error.INSUFFICIENT_LIQUIDITY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates borrow and reverts on rejection.
     * @param cToken Asset whose underlying is being borrowed
     * @param borrower The address borrowing the underlying
     * @param borrowAmount The amount of the underlying asset requested to borrow
     */
    // function borrowVerify(address cToken, address borrower, uint borrowAmount) external override {
    //     cToken;         // currently unused
    //     borrower;       // currently unused
    //     borrowAmount;   // currently unused

    //     if (false) {
    //         maxAssets = maxAssets; // not pure
    //     }
    // }

    /**
     * @notice Checks if the account should be allowed to repay a borrow in the given market
     * @param cToken The market to verify the repay against
     * @param payer The account which would repay the asset
     * @param borrower The account which would borrowed the asset
     * @param repayAmount The amount of the underlying asset the account would repay
     * @return 0 if the repay is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function repayBorrowAllowed(
        address cToken,
        address payer,
        address borrower,
        uint repayAmount) external override returns (uint) {
        payer;         // currently unused
        borrower;      // currently unused
        repayAmount;   // currently unused

        if (!markets[cToken].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        // *may include Policy Hook-type checks

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates repayBorrow and reverts on rejection.
     * @param cToken Asset being repaid
     * @param payer The address repaying the borrow
     * @param borrower The address of the borrower
     * @param repayAmount The amount of underlying being repaid
     */
    // function repayBorrowVerify(
    //     address cToken,
    //     address payer,
    //     address borrower,
    //     uint repayAmount,
    //     uint borrowerIndex) external override {
    //     cToken;        // currently unused
    //     payer;         // currently unused
    //     borrower;      // currently unused
    //     repayAmount;   // currently unused
    //     borrowerIndex; // currently unused

    //     if (false) {
    //         maxAssets = maxAssets; // not pure
    //     }
    // }

    /**
     * @notice Checks if the liquidation should be allowed to occur
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param vestingContract Asset which was used as collateral and will be seized
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param repayAmount The amount of underlying being repaid
     */
    function liquidateBorrowAllowed(
        address cTokenBorrowed,
        IVesting vestingContract,
        address liquidator,
        address borrower,
        uint repayAmount) external override returns (uint) {
        liquidator;   // currently unused
        borrower;     // currently unused
        repayAmount;  // currently unused

        if (!markets[cTokenBorrowed].isListed || !vestingContractInfo[vestingContract].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }
        // *may include Policy Hook-type checks

        /* The borrower must have shortfall in order to be liquidatable */
        (Error err, , uint shortfall) = getAccountLiquidityInternal(borrower);
        if (err != Error.NO_ERROR) {
            return uint(err);
        }
        if (shortfall == 0) {
            return uint(Error.INSUFFICIENT_SHORTFALL);
        }

        /* The liquidator may not repay more than what is allowed by the closeFactor */
        uint borrowBalance = CToken(cTokenBorrowed).borrowBalanceStored(borrower);
        (MathError mathErr, uint maxClose) = mulScalarTruncate(Exp({mantissa: closeFactorMantissa}), borrowBalance);
        if (mathErr != MathError.NO_ERROR) {
            return uint(Error.MATH_ERROR);
        }
        if (repayAmount > maxClose) {
            return uint(Error.TOO_MUCH_REPAY);
        }

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates liquidateBorrow and reverts on rejection.
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param cTokenCollateral Asset which was used as collateral and will be seized
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param repayAmount The amount of underlying being repaid
     */
    // function liquidateBorrowVerify(
    //     address cTokenBorrowed,
    //     address cTokenCollateral,
    //     address liquidator,
    //     address borrower,
    //     uint repayAmount,
    //     uint seizeTokens) external override {
    //     cTokenBorrowed;   // currently unused
    //     cTokenCollateral; // currently unused
    //     liquidator;       // currently unused
    //     borrower;         // currently unused
    //     repayAmount;      // currently unused
    //     seizeTokens;      // currently unused

    //     if (false) {
    //         maxAssets = maxAssets; // not pure
    //     }
    // }

    /**
     * @notice Checks if the seizing of assets should be allowed to occur
     * @param vestingContractWrapper Asset which was used as collateral and will be seized
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param seizeTokens The number of collateral tokens to seize
     */
    function seizeAllowed(
        address vestingContractWrapper,
        address cTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) public override returns (uint) {
        liquidator;       // currently unused
        borrower;         // currently unused
        seizeTokens;      // currently unused

        if (!vestingContractInfo[accountToVesting[borrower]].isListed || !markets[cTokenBorrowed].isListed) {
            return uint(Error.MARKET_NOT_LISTED);
        }

        if (IVestingContractWrapper(vestingContractWrapper).comptroller() != CToken(cTokenBorrowed).comptroller()) {
            return uint(Error.COMPTROLLER_MISMATCH);
        }

        // *may include Policy Hook-type checks

        return uint(Error.NO_ERROR);
    }

    /**
     * @notice Validates seize and reverts on rejection.
     * @param cTokenCollateral Asset which was used as collateral and will be seized
     * @param cTokenBorrowed Asset which was borrowed by the borrower
     * @param liquidator The address repaying the borrow and seizing the collateral
     * @param borrower The address of the borrower
     * @param seizeTokens The number of collateral tokens to seize
     */
    // function seizeVerify(
    //     address cTokenCollateral,
    //     address cTokenBorrowed,
    //     address liquidator,
    //     address borrower,
    //     uint seizeTokens) external override {
    //     cTokenCollateral; // currently unused
    //     cTokenBorrowed;   // currently unused
    //     liquidator;       // currently unused
    //     borrower;         // currently unused
    //     seizeTokens;      // currently unused

    //     if (false) {
    //         maxAssets = maxAssets; // not pure
    //     }
    // }

    /**
     * @notice Checks if the account should be allowed to transfer tokens in the given market
     * @param cToken The market to verify the transfer against
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     * @param transferTokens The number of cTokens to transfer
     * @return 0 if the transfer is allowed, otherwise a semi-opaque error code (See ErrorReporter.sol)
     */
    function transferAllowed(address cToken, address src, address dst, uint transferTokens) external override returns (uint) {
        cToken;         // currently unused
        src;            // currently unused
        dst;            // currently unused
        transferTokens; // currently unused

        // *may include Policy Hook-type checks

        // Currently the only consideration is whether or not
        //  the src is allowed to redeem this many tokens
        return redeemAllowedInternal(cToken, src, transferTokens);
    }

    /**
     * @notice Validates transfer and reverts on rejection.
     * @param cToken Asset being transferred
     * @param src The account which sources the tokens
     * @param dst The account which receives the tokens
     * @param transferTokens The number of cTokens to transfer
     */
    // function transferVerify(address cToken, address src, address dst, uint transferTokens) external override {
    //     cToken;         // currently unused
    //     src;            // currently unused
    //     dst;            // currently unused
    //     transferTokens; // currently unused

    //     if (false) {
    //         maxAssets = maxAssets; // not pure
    //     }
    // }

    /*** Liquidity/Liquidation Calculations ***/

    /**
     * @notice Calculates the NPV of a collateral vesting contract for a given originalOwner
     * @param owner The original owner / recipient of the vesting Collateral
     * @dev Note that we calculate the exchangeRateStored for each collateral cToken using stored data,
     *  without calculating accumulated interest.
     * @return (possible error code,
     *          accountLiquidity)
     */

    function vestingCalculateNPV(address owner) public override view returns (uint, uint256) {

        IVestingContractWrapper _vestingWrapper = IVestingContractWrapper(vestingContractInfo[accountToVesting[owner]].vestingContractWrapper);

        uint err;
        uint256 calculatedNPV;    

        (err, calculatedNPV) = _vestingWrapper.getNPV(vestingNPVConfig.phaseOneCutoff,
            vestingNPVConfig.phaseTwoCutoff,
            vestingNPVConfig.phaseOneDiscountMantissa,
            vestingNPVConfig.phaseTwoDiscountMantissa,
            vestingNPVConfig.phaseThreeDiscountMantissa);

        if (err != 0) {
            return (uint(Error.MATH_ERROR),0);
        } else {
            return (uint(Error.NO_ERROR), calculatedNPV);
        }   

    }

    /**
     * @dev Local vars for avoiding stack-depth limits in calculating account liquidity.
     *  Note that `cTokenBalance` is the number of cTokens the account owns in the market,
     *  whereas `borrowBalance` is the amount of underlying that the account has borrowed.
     */
    struct AccountLiquidityLocalVars {
        uint sumCollateral;
        uint sumBorrowPlusEffects;
        uint cTokenBalance;
        uint borrowBalance;
        uint exchangeRateMantissa;
        uint oraclePriceMantissa;
        uint collateralNPV;
        Exp collateralFactor;
        Exp exchangeRate;
        Exp oraclePrice;
        Exp tokensToEther;
    }

    /**
     * @notice Determine the current account liquidity wrt collateral requirements
     * @return (possible error code (semi-opaque),
                account liquidity in excess of collateral requirements,
     *          account shortfall below collateral requirements)
     */
    function getAccountLiquidity(address account) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidityInternal(account, CToken(0), 0, 0);

        return (uint(err), liquidity, shortfall);
    }

    /**
     * @notice Determine the current account liquidity wrt collateral requirements
     * @return (possible error code,
                account liquidity in excess of collateral requirements,
     *          account shortfall below collateral requirements)
     */
    function getAccountLiquidityInternal(address account) internal view returns (Error, uint, uint) {
        return getHypotheticalAccountLiquidityInternal(account, CToken(0), 0, 0);
    }

    /**
     * @notice Determine what the account liquidity would be if the given amounts were redeemed/borrowed
     * @param cTokenModify The market to hypothetically redeem/borrow in
     * @param account The account to determine liquidity for
     * @param redeemTokens The number of tokens to hypothetically redeem
     * @param borrowAmount The amount of underlying to hypothetically borrow
     * @dev Note that we calculate the exchangeRateStored for each collateral cToken using stored data,
     *  without calculating accumulated interest.
     * @return (possible error code,
                hypothetical account liquidity in excess of collateral requirements,
     *          hypothetical account shortfall below collateral requirements)
     */
    function getHypotheticalAccountLiquidityInternal(
        address account,
        CToken cTokenModify,
        uint redeemTokens,
        uint borrowAmount) internal view returns (Error, uint, uint) {

        AccountLiquidityLocalVars memory vars; // Holds all our calculation results
        uint oErr;
        MathError mErr;

        // Collateral vesting contract value calculation
        // collareral = NPV * collaralFactor * underlyingPrice (in Ether)

        // calculate NPV of collateral (checks if account has vestingContract)
        (oErr, vars.collateralNPV)= vestingCalculateNPV(account);
        if (oErr != 0) {
            return (Error.MATH_ERROR, 0, 0);
        }

        // Subtract amount owed to liquidators (in native token)
        if (vestingContractInfo[accountToVesting[account]].amountOwedToLiquidator > 0) {
            vars.collateralNPV = vars.collateralNPV.sub(vestingContractInfo[accountToVesting[account]].amountOwedToLiquidator);
        }

        // get underlying price
        vars.oraclePriceMantissa = oracle.getPrice(vestingNPVConfig.underlyingAddress);
        if (vars.oraclePriceMantissa == 0) {
            return (Error.PRICE_ERROR, 0, 0);
        }
        vars.oraclePrice = Exp({mantissa: vars.oraclePriceMantissa});


        vars.collateralFactor = Exp({mantissa: vestingNPVConfig.collateralFactorMantissa});

        // calculate tokensToEther = collareralFactor * oraclePrice
        (mErr, vars.tokensToEther) = mulExp(vars.collateralFactor, vars.oraclePrice);
        if (mErr != MathError.NO_ERROR) {
            return (Error.MATH_ERROR, 0, 0);
        }

        // sumCollateral += tokensToEther * NPV Value
        (mErr, vars.sumCollateral) = mulScalarTruncateAddUInt(vars.tokensToEther, vars.collateralNPV, vars.sumCollateral);
        if (mErr != MathError.NO_ERROR) {
            return (Error.MATH_ERROR, 0, 0);
        }


        // For each asset the account is in  -> will only apply to stablecoin side (i = 1)
        CToken[] memory assets = accountAssets[account];
        for (uint i = 0; i < assets.length; i++) {
            CToken asset = assets[i];

            // Read the balances and exchange rate from the cToken
            (oErr, vars.cTokenBalance, vars.borrowBalance, vars.exchangeRateMantissa) = asset.getAccountSnapshot(account);
            if (oErr != 0) { // semi-opaque error code, we assume NO_ERROR == 0 is invariant between upgrades
                return (Error.SNAPSHOT_ERROR, 0, 0);
            }
            vars.collateralFactor = Exp({mantissa: markets[address(asset)].collateralFactorMantissa});
            vars.exchangeRate = Exp({mantissa: vars.exchangeRateMantissa});

            // Get the normalized price of the asset
            vars.oraclePriceMantissa = oracle.getUnderlyingPrice(asset);
            if (vars.oraclePriceMantissa == 0) {
                return (Error.PRICE_ERROR, 0, 0);
            }
            vars.oraclePrice = Exp({mantissa: vars.oraclePriceMantissa});


            // Pre-compute a conversion factor from tokens -> ether (normalized price value)
            (mErr, vars.tokensToEther) = mulExp3(vars.collateralFactor, vars.exchangeRate, vars.oraclePrice);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0, 0);
            }

            // sumCollateral += tokensToEther * cTokenBalance
            (mErr, vars.sumCollateral) = mulScalarTruncateAddUInt(vars.tokensToEther, vars.cTokenBalance, vars.sumCollateral);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0, 0);
            }

            // sumBorrowPlusEffects += oraclePrice * borrowBalance
            (mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(vars.oraclePrice, vars.borrowBalance, vars.sumBorrowPlusEffects);
            if (mErr != MathError.NO_ERROR) {
                return (Error.MATH_ERROR, 0, 0);
            }

            // Calculate effects of interacting with cTokenModify
            if (asset == cTokenModify) {
                // redeem effect
                // sumBorrowPlusEffects += tokensToEther * redeemTokens
                (mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(vars.tokensToEther, redeemTokens, vars.sumBorrowPlusEffects);
                if (mErr != MathError.NO_ERROR) {
                    return (Error.MATH_ERROR, 0, 0);
                }

                // borrow effect
                // sumBorrowPlusEffects += oraclePrice * borrowAmount
                (mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(vars.oraclePrice, borrowAmount, vars.sumBorrowPlusEffects);
                if (mErr != MathError.NO_ERROR) {
                    return (Error.MATH_ERROR, 0, 0);
                }
            }
        }

        // These are safe, as the underflow condition is checked first
        if (vars.sumCollateral > vars.sumBorrowPlusEffects) {
            return (Error.NO_ERROR, vars.sumCollateral - vars.sumBorrowPlusEffects, 0);
        } else {
            return (Error.NO_ERROR, 0, vars.sumBorrowPlusEffects - vars.sumCollateral);
        }
    }

    /**
     * @notice Calculate number of tokens of collateral asset to seize given an underlying amount
     * @dev Used in liquidation (called in cToken.liquidateBorrowFresh)
     * @param cTokenBorrowed The address of the borrowed cToken
     * @param repayAmount The amount of cTokenBorrowed underlying to convert into cTokenCollateral tokens
     * @return (errorCode, number of cTokenCollateral tokens to be seized in a liquidation)
     */
    function liquidateCalculateSeizeTokens(address cTokenBorrowed, uint repayAmount) external override view returns (uint, uint) {
        /* Read oracle prices for borrowed and collateral markets */
        uint priceBorrowedMantissa = oracle.getUnderlyingPrice(CToken(cTokenBorrowed));
        uint priceCollateralMantissa = oracle.getPrice(vestingNPVConfig.underlyingAddress);
        if (priceBorrowedMantissa == 0 || priceCollateralMantissa == 0) {
            return (uint(Error.PRICE_ERROR), 0);
        }

        /*
         * Get the exchange rate and calculate the number of collateral tokens to seize:
         *  seizeAmount = repayAmount * liquidationIncentive * priceBorrowed / priceCollateral
         *  seizeTokens = seizeAmount
         *   = repayAmount * (liquidationIncentive * priceBorrowed) / priceCollateral
         */
        uint seizeTokens;
        Exp memory numerator;
        Exp memory ratio;
        MathError mathErr;

        (mathErr, numerator) = mulExp(liquidationIncentiveMantissa, priceBorrowedMantissa);
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        (mathErr, ratio) = divExp(numerator, Exp({mantissa: priceCollateralMantissa}));
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        (mathErr, seizeTokens) = mulScalarTruncate(ratio, repayAmount);
        if (mathErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        return (uint(Error.NO_ERROR), seizeTokens);
    }
    

    /*** Admin Functions ***/

    /**
      * @notice Sets a new price oracle for the comptroller
      * @dev Admin function to set a new price oracle
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setPriceOracle(PriceOracle newOracle) public returns (uint) {
        // Check caller is admin OR currently initialzing as new unitroller implementation
        if (!adminOrInitializing()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PRICE_ORACLE_OWNER_CHECK);
        }

        // Track the old oracle for the comptroller
        // PriceOracle oldOracle = oracle;

        // Ensure invoke newOracle.isPriceOracle() returns true
        // require(newOracle.isPriceOracle(), "oracle method isPriceOracle returned false");

        // Set comptroller's oracle to newOracle
        oracle = newOracle;

        // Emit NewPriceOracle(oldOracle, newOracle)
        // emit NewPriceOracle(oldOracle, newOracle);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the closeFactor used when liquidating borrows
      * @dev Admin function to set closeFactor
      * @param newCloseFactorMantissa New close factor, scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setCloseFactor(uint newCloseFactorMantissa) external returns (uint256) {
        // Check caller is admin OR currently initialzing as new unitroller implementation
        if (!adminOrInitializing()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_CLOSE_FACTOR_OWNER_CHECK);
        }

        Exp memory newCloseFactorExp = Exp({mantissa: newCloseFactorMantissa});
        Exp memory lowLimit = Exp({mantissa: closeFactorMinMantissa});
        if (lessThanOrEqualExp(newCloseFactorExp, lowLimit)) {
            return fail(Error.INVALID_CLOSE_FACTOR, FailureInfo.SET_CLOSE_FACTOR_VALIDATION);
        }

        Exp memory highLimit = Exp({mantissa: closeFactorMaxMantissa});
        if (lessThanExp(highLimit, newCloseFactorExp)) {
            return fail(Error.INVALID_CLOSE_FACTOR, FailureInfo.SET_CLOSE_FACTOR_VALIDATION);
        }

        // uint oldCloseFactorMantissa = closeFactorMantissa;
        closeFactorMantissa = newCloseFactorMantissa;
        // emit NewCloseFactor(oldCloseFactorMantissa, closeFactorMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets the collateralFactor for a market
      * @dev Admin function to set per-market collateralFactor
      * @param cToken The market to set the factor on
      * @param newCollateralFactorMantissa The new collateral factor, scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setCollateralFactor(CToken cToken, uint newCollateralFactorMantissa) external returns (uint256) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_COLLATERAL_FACTOR_OWNER_CHECK);
        }

        // Verify market is listed
        Market storage market = markets[address(cToken)];
        if (!market.isListed) {
            return fail(Error.MARKET_NOT_LISTED, FailureInfo.SET_COLLATERAL_FACTOR_NO_EXISTS);
        }

        Exp memory newCollateralFactorExp = Exp({mantissa: newCollateralFactorMantissa});

        // Check collateral factor <= 0.9
        Exp memory highLimit = Exp({mantissa: collateralFactorMaxMantissa});
        if (lessThanExp(highLimit, newCollateralFactorExp)) {
            return fail(Error.INVALID_COLLATERAL_FACTOR, FailureInfo.SET_COLLATERAL_FACTOR_VALIDATION);
        }

        // If collateral factor != 0, fail if price == 0
        if (newCollateralFactorMantissa != 0 && oracle.getUnderlyingPrice(cToken) == 0) {
            return fail(Error.PRICE_ERROR, FailureInfo.SET_COLLATERAL_FACTOR_WITHOUT_PRICE);
        }

        // Set market's collateral factor to new collateral factor, remember old value
        // uint oldCollateralFactorMantissa = market.collateralFactorMantissa;
        market.collateralFactorMantissa = newCollateralFactorMantissa;

        // Emit event with asset, old collateral factor, and new collateral factor
        // emit NewCollateralFactor(cToken, oldCollateralFactorMantissa, newCollateralFactorMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets maxAssets which controls how many markets can be entered
      * @dev Admin function to set maxAssets
      * @param newMaxAssets New max assets
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setMaxAssets(uint newMaxAssets) external returns (uint) {
        // Check caller is admin OR currently initialzing as new unitroller implementation
        if (!adminOrInitializing()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_MAX_ASSETS_OWNER_CHECK);
        }

        // uint oldMaxAssets = maxAssets;
        maxAssets = newMaxAssets;
        // emit NewMaxAssets(oldMaxAssets, newMaxAssets);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Sets liquidationIncentive
      * @dev Admin function to set liquidationIncentive
      * @param newLiquidationIncentiveMantissa New liquidationIncentive scaled by 1e18
      * @return uint 0=success, otherwise a failure. (See ErrorReporter for details)
      */
    function _setLiquidationIncentive(uint newLiquidationIncentiveMantissa) external returns (uint) {
        // Check caller is admin OR currently initialzing as new unitroller implementation
        if (!adminOrInitializing()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_LIQUIDATION_INCENTIVE_OWNER_CHECK);
        }

        // Check de-scaled 1 <= newLiquidationDiscount <= 1.5
        Exp memory newLiquidationIncentive = Exp({mantissa: newLiquidationIncentiveMantissa});
        Exp memory minLiquidationIncentive = Exp({mantissa: liquidationIncentiveMinMantissa});
        if (lessThanExp(newLiquidationIncentive, minLiquidationIncentive)) {
            return fail(Error.INVALID_LIQUIDATION_INCENTIVE, FailureInfo.SET_LIQUIDATION_INCENTIVE_VALIDATION);
        }

        Exp memory maxLiquidationIncentive = Exp({mantissa: liquidationIncentiveMaxMantissa});
        if (lessThanExp(maxLiquidationIncentive, newLiquidationIncentive)) {
            return fail(Error.INVALID_LIQUIDATION_INCENTIVE, FailureInfo.SET_LIQUIDATION_INCENTIVE_VALIDATION);
        }

        // Save current value for use in log
        // uint oldLiquidationIncentiveMantissa = liquidationIncentiveMantissa;

        // Set liquidation incentive to new incentive
        liquidationIncentiveMantissa = newLiquidationIncentiveMantissa;

        // Emit event with old incentive, new incentive
        // emit NewLiquidationIncentive(oldLiquidationIncentiveMantissa, newLiquidationIncentiveMantissa);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Add the market to the markets mapping and set it as listed
      * @dev Admin function to set isListed and add support for the market
      * @param cToken The address of the market (token) to list
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _supportMarket(CToken cToken) external returns (uint) {
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SUPPORT_MARKET_OWNER_CHECK);
        }

        if (markets[address(cToken)].isListed) {
            return fail(Error.MARKET_ALREADY_LISTED, FailureInfo.SUPPORT_MARKET_EXISTS);
        }

        cToken.isCToken(); // Sanity check to make sure its really a CToken

        markets[address(cToken)] = Market({isListed: true, collateralFactorMantissa: 0});
        // emit MarketListed(cToken);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Add the vesting contract collateral and list as collateral
      * @dev Admin function to set isListed and add support for the market
      * @param _vestingContractAddress to list as collateral
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _supportCollateralVault(address _vestingContractAddress) external override returns (uint) {
        require(allowedCaller[msg.sender], "Not Comptroller or whitelisted factory");

        IVesting _vestingContract = IVesting(_vestingContractAddress);

        require(!vestingContractInfo[_vestingContract].isListed, "Vault listed");

        // Sanity check to make sure its really a vesting contract
        _vestingContract.vestingBegin();

        // Check if collateral vault is deployed for user
        VestingContractWrapper vestingContractWrapper;
        if (vestingContractInfo[_vestingContract].vestingContractWrapper == address(0)) {
            // Deploy vesting collateral wrapper
            vestingContractWrapper = new VestingContractWrapper(
                _vestingContract,
                this
            );
        }

        vestingContractInfo[_vestingContract] = VestingContractInfo({
            isListed: true,
            enabledAsCollateral: false,
            vestingContractWrapper: address(vestingContractWrapper),
            unvestedTokenLiquidator: address(0),
            amountOwedToLiquidator: 0
        });

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice sets the VestingNPVConfigValues
      * @dev Admin function to set the VestingNPVConfig struct
      * @param _phaseOneCutoff value in block time for first phase 
      * @param _phaseOneDiscountMantissa discount factor (e.g. 0.5) per phase in Mantissa
      * @return uint 0=success, otherwise a failure. (See enum Error for details)
      */
    function _setVestingNPVConfig(
        address _underlyingAddress,
        uint256 _phaseOneCutoff,
        uint256 _phaseTwoCutoff,
        uint _phaseOneDiscountMantissa,
        uint _phaseTwoDiscountMantissa,
        uint _phaseThreeDiscountMantissa,
        uint _collateralFactorMantissa) external returns (uint) {
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SUPPORT_MARKET_OWNER_CHECK);
        }

        require(_phaseOneCutoff <= _phaseTwoCutoff, "phaseOneCutoff must be less than phaseTwo");

        require(_collateralFactorMantissa <= collateralFactorMaxMantissa, "Collateral factor must be less than Max");
        require(_collateralFactorMantissa >= closeFactorMinMantissa, "Collateral factor must be greater than min");

        vestingNPVConfig.underlyingAddress = _underlyingAddress;
        vestingNPVConfig.phaseOneCutoff = _phaseOneCutoff;
        vestingNPVConfig.phaseTwoCutoff = _phaseTwoCutoff;
        vestingNPVConfig.phaseOneDiscountMantissa = _phaseOneDiscountMantissa;
        vestingNPVConfig.phaseTwoDiscountMantissa = _phaseTwoDiscountMantissa;
        vestingNPVConfig.phaseThreeDiscountMantissa = _phaseThreeDiscountMantissa;
        vestingNPVConfig.collateralFactorMantissa = _collateralFactorMantissa;

        return uint(Error.NO_ERROR);
    }

    function _updateAllowedCaller(address _caller, bool _status) external {
        require (msg.sender == admin, "Must be admin");
        allowedCaller[_caller] = _status;
    }

    /**
     * @dev Check that caller is admin or this contract is initializing itself as
     * the new implementation.
     * There should be no way to satisfy msg.sender == comptrollerImplementaiton
     * without tx.origin also being admin, but both are included for extra safety
     */
    function adminOrInitializing() internal view returns (bool) {
        bool initializing = (
                msg.sender == comptrollerImplementation
                &&
                //solium-disable-next-line security/no-tx-origin
                tx.origin == admin
        );
        bool isAdmin = msg.sender == admin;
        return isAdmin || initializing;
    }
}