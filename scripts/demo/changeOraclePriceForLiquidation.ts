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

  // Trigger shortfall
  await execute("SimplePriceOracle", {from: deployer, log: true}, "setDirectPrice", chainlink.address, ether(3));
  console.log("Updated oracle price to: $3");
  
  // Getting accountLiquidity with shortfall
  const accountLiquidityShortFallOne = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!accountLiquidityShortFallOne[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityShortFallOne[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityShortFallOne[1].toString();
    const calculatedShortfall = accountLiquidityShortFallOne[2].toString();
    console.log('Post Oracle Update Calculated Liquidity Borrower 1 (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Getting accountLiquidity with shortfall
  const accountLiquidityShortFallTwo = await read("Comptroller", {},"getAccountLiquidity", borrower2);

  if (!accountLiquidityShortFallTwo[0].isZero()) {
    console.log('error calculating NPV - ' + accountLiquidityShortFallTwo[0].toString());
  } else {
    const calculatedLiquidity = accountLiquidityShortFallTwo[1].toString();
    const calculatedShortfall = accountLiquidityShortFallTwo[2].toString();
    console.log('Post Oracle Update Calculated Liquidity Borrower 2 (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });