import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber, constants } from "ethers";
import { executionAsyncResource } from "async_hooks";
import {ether} from "../utils/common/unitsUtils"; 

async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2, liquidator} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const chainlink = await deployments.get("LINKMockToken");
  const vestingOne = await deployments.get("Vesting");
  const vestingTwo = await deployments.get("VestingUserTwo");
  const jUSDC = await deployments.get("CErc20");

  // Register for market
  await execute("Vesting", {from: borrower1, log: true}, "setRecipient",comptroller.address);
  await execute("Comptroller", {from: borrower1, log: true}, "registerVestingContract", vestingOne.address);

  // Enters markets
  await execute("Comptroller", {from: borrower1, log: true}, "enterMarkets", [jUSDC.address]);

  const balancePrevious = await read("CErc20", {}, "balanceOf", borrower1);
  const totalSupply = await read("CErc20", {}, "totalSupply");

  // Borrow $3M USDC
  await execute("CErc20", {from: borrower1, log: true}, "borrow", '3000000000000');

  // Get USDC balance post
  const balancePost = await read("USDCMockToken", {}, "balanceOf", borrower1);
  
  console.log("Total jUSDC supply: ", totalSupply.toString());
  console.log("Previous USDC borrower balance: ", balancePrevious.toString());
  console.log("Current USDC borrower balance: ", balancePost.toString());

  // Calculating NPV and liquidity post
  const vestingCalculateNPVPost = await read("Comptroller", {},"vestingCalculateNPV", borrower1);

  if (!vestingCalculateNPVPost[0].isZero()) {
    console.log('error calculating NPV - ' + vestingCalculateNPVPost[0].toString());
  } else {
    const calculatedNPVPost = vestingCalculateNPVPost[1].toString();
    console.log('Post Borrow Calculated NPV (Raw): ' + calculatedNPVPost);
  }
  const accountLiquidityPost = await read("Comptroller", {},"getAccountLiquidity", borrower1);
  if (!accountLiquidityPost[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityPost[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityPost[1].toString();
    const calculatedShortfall = accountLiquidityPost[2].toString();
    console.log('Post Borrow Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Trigger shortfall
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", chainlink.address, ether(5));
  console.log("Updated oracle price to: $3");
  
  // Getting accountLiquidity with shortfall
  const accountLiquidityShortFall = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityShortFall[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityShortFall[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityShortFall[1].toString();
    const calculatedShortfall = accountLiquidityShortFall[2].toString();
    console.log('Post Oracle Update Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Liquidate unvested
  const vestingContractBalancePrevious = await read("LINKMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePrevious = await read("LINKMockToken", {}, "balanceOf", deployer);
  await execute("USDCMockToken", {from: deployer, log: true}, "approve", jUSDC.address, '1000000000000000000');
  await execute("CErc20", {from: deployer, log: true}, "liquidateBorrow", borrower1, '1500000000000', vestingOne.address); // Repay $1.5M
  const vestingContractBalancePost = await read("LINKMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePost = await read("LINKMockToken", {}, "balanceOf", deployer);
  console.log("Previous Vesting Contract Balance: ", vestingContractBalancePrevious.toString());
  console.log("Current Vesting Contract Balance: ", vestingContractBalancePost.toString());
  console.log("Amount of YFI transferred to liquidator: ", liquidatorBalancePost.sub(liquidatorBalancePrevious).toString());
  // Get liquidator is owed
  const owedLiquidatedInfo = await read("Comptroller", {},"vestingContractInfo", vestingOne.address);
  console.log("Liquidator is owed: ", owedLiquidatedInfo[4].toString());

  // Getting accountLiquidity after liquidation
  const accountLiquidityLiquidations = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityLiquidations[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityLiquidations[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityLiquidations[1].toString();
    const calculatedShortfall = accountLiquidityLiquidations[2].toString();
    console.log('Post Repay Update Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Set oracle back to 10 and repay debt
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", chainlink.address, ether(10));
  await execute("CErc20", {from: deployer, log: true}, "repayBorrowBehalf", borrower1, constants.MaxUint256); // repay all debt FROM deployer on behalf of borrower

  // Getting accountLiquidity after repay
  const accountLiquidityAfterRepay = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityAfterRepay[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityAfterRepay[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityAfterRepay[1].toString();
    const calculatedShortfall = accountLiquidityAfterRepay[2].toString();
    console.log('Post Repay Update Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Claim rewards by liquidator and read rewards, even if price changes liquidator is owed the same amount stored in state
  const vestingContractBalancePreviousClaim = await read("LINKMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePreviousClaim = await read("LINKMockToken", {}, "balanceOf", deployer);
  await execute("Comptroller", {from: deployer, log: true}, "liquidatorClaimOwedTokens", vestingOne.address);
  const vestingContractBalancePostClaim = await read("LINKMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePostClaim = await read("LINKMockToken", {}, "balanceOf", deployer);
  console.log("Previous Vesting Contract Balance (Pre claim): ", vestingContractBalancePreviousClaim.toString());
  console.log("Current Vesting Contract Balance (Post claim): ", vestingContractBalancePostClaim.toString());
  console.log("Amount of YFI transferred to liquidator (Post claim): ", liquidatorBalancePostClaim.sub(liquidatorBalancePreviousClaim).toString());
  // Get liquidator is owed
  const owedLiquidatedInfoPostClaim = await read("Comptroller", {},"vestingContractInfo", vestingOne.address);
  console.log("Liquidator is owed (Post claim): ", owedLiquidatedInfoPostClaim[4].toString());

  // Withdraw Vesting contract. Expect it to FAIL
  try {
    await execute("Comptroller", {from: borrower1, log: true}, "withdrawVestingContract", vestingOne.address);
  } catch(e) {
    console.log("EXPECTED TO FAIL WITH ERROR: ", e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });