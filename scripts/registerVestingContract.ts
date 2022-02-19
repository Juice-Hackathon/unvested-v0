import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber } from "ethers";
import { executionAsyncResource } from "async_hooks";



async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const vestingOne = await deployments.get("Vesting");
  const vestingTwo = await deployments.get("VestingUserTwo");

  // Transfer Ownership of Vesting Contract
  await execute("Vesting", {from: borrower1, log: true}, "setRecipient",comptroller.address);
  await execute("Comptroller", {from: borrower1, log: true}, "registerVestingContract", vestingOne.address);

  // Calculating NPV
  var calculatedNPV;

  var res = await read("Comptroller", {},"vestingCalculateNPV", borrower1);

  if (res[0] == BigNumber.from(0)) {
    console.log('error calculating NPV');
  } else {
    calculatedNPV = res[1].div(BigNumber.from("1000000000000000000")).toNumber();
    console.log('Calculated NPV: ' + calculatedNPV.toString());
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });