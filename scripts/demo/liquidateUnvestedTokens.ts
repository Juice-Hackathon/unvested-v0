import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber, constants } from "ethers";
import { executionAsyncResource } from "async_hooks";
import {ether} from "../utils/common/unitsUtils"; 

async function main() {

  const { execute, read } = deployments;
  const {deployer, borrower1, borrower2, liquidator} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const chainlink = await deployments.get("YearnMockToken");
  const vestingOne = await deployments.get("Vesting");
  const vestingTwo = await deployments.get("VestingUserTwo");
  const jUSDC = await deployments.get("CErc20");

  // Trigger shortfall
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", chainlink.address, ether(5));
  console.log("Updated oracle price to: $2000");
  
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
  const vestingContractBalancePrevious = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePrevious = await read("YearnMockToken", {}, "balanceOf", deployer);
  await execute("StandardTokenMock", {from: deployer, log: true}, "approve", jUSDC.address, '1000000000000000000');
  await execute("CErc20", {from: deployer, log: true}, "liquidateBorrow", borrower1, '1500000000000', vestingOne.address); // Repay $1.5M
  const vestingContractBalancePost = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePost = await read("YearnMockToken", {}, "balanceOf", deployer);
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

  // Set oracle back to 10
  // await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", chainlink.address, ether(10));

  // Claim rewards by liquidator and read rewards, even if price changes liquidator is owed the same amount stored in state
  const vestingContractBalancePreviousClaim = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePreviousClaim = await read("YearnMockToken", {}, "balanceOf", deployer);
  await execute("Comptroller", {from: deployer, log: true}, "liquidatorClaimOwedTokens", vestingOne.address);
  const vestingContractBalancePostClaim = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePostClaim = await read("YearnMockToken", {}, "balanceOf", deployer);
  console.log("Previous Vesting Contract Balance (Pre claim): ", vestingContractBalancePreviousClaim.toString());
  console.log("Current Vesting Contract Balance (Post claim): ", vestingContractBalancePostClaim.toString());
  console.log("Amount of YFI transferred to liquidator (Post claim): ", liquidatorBalancePostClaim.sub(liquidatorBalancePreviousClaim).toString());
  // Get liquidator is owed
  const owedLiquidatedInfoPostClaim = await read("Comptroller", {},"vestingContractInfo", vestingOne.address);
  console.log("Liquidator is owed (Post claim): ", owedLiquidatedInfoPostClaim[4].toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });