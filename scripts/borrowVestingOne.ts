import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber, constants } from "ethers";
import { executionAsyncResource } from "async_hooks";
import {ether} from "../utils/common/unitsUtils"; 

async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2} = await getNamedAccounts();

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

  // Calculating NPV and liquidity prior
  const vestingCalculateNPVPrevious = await read("Comptroller", {},"vestingCalculateNPV", borrower1);

  if (!vestingCalculateNPVPrevious[0].isZero()) {
    console.log('error calculating NPV - ' + vestingCalculateNPVPrevious[0].toString());
  } else {
    const calculatedNPVPrevious = vestingCalculateNPVPrevious[1].toString();
    console.log('Pre Borrow Calculated NPV (Raw): ' + calculatedNPVPrevious);
  }

  // Getting accountLiquidity
  const accountLiquidityPrevious = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityPrevious[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityPrevious[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityPrevious[1].toString();
    const calculatedShortfall = accountLiquidityPrevious[2].toString();
    console.log('Pre Borrow Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  const balancePrevious = await read("CErc20", {}, "balanceOf", borrower1);
  const totalSupply = await read("StandardTokenMock", {}, "totalSupply");

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
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", yfi.address, ether(2000));
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

  // Test unregister. Should fail
  try {
    await execute("Comptroller", {from: borrower1, log: true}, "withdrawVestingContract", vestingOne.address);
  } catch(e) {
    console.log("EXPECTED TO FAIL WITH ERROR: ", e);
  }

  // Set oracle back to 10k and repay debt
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", yfi.address, ether(10000));
  await execute("StandardTokenMock", {from: borrower1, log: true}, "approve", jUSDC.address, '1000000000000000000');
  await execute("CErc20", {from: deployer, log: true}, "repayBorrowBehalf", borrower1, constants.MaxUint256); // repay all debt FROM deployer on behalf of borrower

  // Getting accountLiquidity with shortfall
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