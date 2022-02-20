import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber, constants } from "ethers";
import { executionAsyncResource } from "async_hooks";
import {ether} from "../utils/common/unitsUtils"; 

async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2, liquidator} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const yfi = await deployments.get("YearnMockToken");
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

  // Borrow $1M USDC
  await execute("CErc20", {from: borrower1, log: true}, "borrow", '1000000000000');

  // Get USDC balance post
  const balancePost = await read("StandardTokenMock", {}, "balanceOf", borrower1);
  
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
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", yfi.address, ether(3));
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

  // Liquidate
  const vestingContractBalancePrevious = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePrevious = await read("YearnMockToken", {}, "balanceOf", deployer);
  await execute("StandardTokenMock", {from: deployer, log: true}, "approve", jUSDC.address, '1000000000000000000');
  await execute("CErc20", {from: deployer, log: true}, "liquidateBorrow", borrower1, '100000000', vestingOne.address); // Repay $100
  const vestingContractBalancePost = await read("YearnMockToken", {}, "balanceOf", vestingOne.address);
  const liquidatorBalancePost = await read("YearnMockToken", {}, "balanceOf", deployer);
  console.log("Previous Vesting Contract Balance: ", vestingContractBalancePrevious.toString());
  console.log("Current Vesting Contract Balance: ", vestingContractBalancePost.toString());
  console.log("Amount of YFI transferred to liquidator: ", liquidatorBalancePost.sub(liquidatorBalancePrevious).toString());

  // Getting accountLiquidity after liquidation
  const accountLiquidityLiquidations = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityLiquidations[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityLiquidations[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityLiquidations[1].toString();
    const calculatedShortfall = accountLiquidityLiquidations[2].toString();
    console.log('Post Repay Update Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Set oracle back to 10k and repay debt
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", yfi.address, ether(10));
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

  // Withdraw Vesting contract
  await execute("Comptroller", {from: borrower1, log: true}, "withdrawVestingContract", vestingOne.address);

  const owner = await read("Vesting", {},"recipient");
  console.log("Old recipient (Comptroller): ", comptroller.address, " New recipient: ", owner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });