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

  // Claim rewards by liquidator and read rewards, even if price changes liquidator is owed the same amount stored in state
  const vestingContractBalancePreviousClaim = await read("YearnMockToken", {}, "balanceOf", vestingTwo.address);
  const liquidatorBalancePreviousClaim = await read("YearnMockToken", {}, "balanceOf", deployer);
  await execute("Comptroller", {from: deployer, log: true}, "liquidatorClaimOwedTokens", vestingTwo.address);
  const vestingContractBalancePostClaim = await read("YearnMockToken", {}, "balanceOf", vestingTwo.address);
  const liquidatorBalancePostClaim = await read("YearnMockToken", {}, "balanceOf", deployer);
  console.log("Previous Vesting Contract Balance (Pre claim): ", vestingContractBalancePreviousClaim.toString());
  console.log("Current Vesting Contract Balance (Post claim): ", vestingContractBalancePostClaim.toString());
  console.log("Amount of LINK transferred to liquidator (Post claim): ", liquidatorBalancePostClaim.sub(liquidatorBalancePreviousClaim).toString());
  // Get liquidator is owed
  const owedLiquidatedInfoPostClaim = await read("Comptroller", {},"vestingContractInfo", vestingTwo.address);
  console.log("Liquidator is owed (Post claim): ", owedLiquidatedInfoPostClaim[4].toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });