import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber } from "ethers";
import { executionAsyncResource } from "async_hooks";
import { ether } from "../utils/common/unitsUtils"; 

async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const vestingDemoCreator = await deployments.get("VestingDemoCreator");

  await execute(
    "VestingDemoCreator",
    {from: deployer, log: true},
    "create",
    borrower2,
    ether(1000000), // 1000000 LINK vesting amount
    1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
    1644937095, // No cliff
    1708009095 // Thursday, February 15, 2024 2:58:15 PM);
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });