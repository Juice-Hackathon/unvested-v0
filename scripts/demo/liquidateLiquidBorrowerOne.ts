import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber, constants } from "ethers";
import { executionAsyncResource } from "async_hooks";
import {ether} from "../../utils/common/unitsUtils"; 

async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2, liquidator} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const chainlink = await deployments.get("YearnMockToken");
  const vestingOne = await deployments.get("Vesting");
  const vestingTwo = await deployments.get("VestingUserTwo");
  const jUSDC = await deployments.get("CErc20");

  // Liquidate borrower 1
  const vestingContractBalancePrevious = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePrevious = await read("YearnMockToken", {}, "balanceOf", deployer);
  await execute("StandardTokenMock", {from: deployer, log: true}, "approve", jUSDC.address, '1000000000000000000');
  await execute("CErc20", {from: deployer, log: true}, "liquidateBorrow", borrower1, '100000000', vestingOne.address); // Repay $100
  const vestingContractBalancePost = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePost = await read("YearnMockToken", {}, "balanceOf", deployer);
  console.log("Previous Vesting Contract Balance: ", vestingContractBalancePrevious.toString());
  console.log("Current Vesting Contract Balance: ", vestingContractBalancePost.toString());
  console.log("Amount of LINK transferred to liquidator: ", liquidatorBalancePost.sub(liquidatorBalancePrevious).toString());

  // Getting accountLiquidity after liquidation
  const accountLiquidityLiquidations = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityLiquidations[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityLiquidations[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityLiquidations[1].toString();
    const calculatedShortfall = accountLiquidityLiquidations[2].toString();
    console.log('Post Repay Update Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Set oracle back to 10k
  // await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", chainlink.address, ether(10));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });