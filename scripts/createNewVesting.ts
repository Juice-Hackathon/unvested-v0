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
    borrower2
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });