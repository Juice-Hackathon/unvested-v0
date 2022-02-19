import { ethers, getNamedAccounts, deployments} from "hardhat";
import { BigNumber } from "ethers";
import { executionAsyncResource } from "async_hooks";



async function main() {

  const { execute, read } = deployments;
  const {deployer, lender, borrower1, borrower2} = await getNamedAccounts();

  const comptroller = await deployments.get("Comptroller");
  const vestingOne = await deployments.get("Vesting");
  const vestingTwo = await deployments.get("VestingUserTwo");

  var res;

  // Transfer Ownership of Vesting Contract
  await execute("Vesting", {from: borrower1, log: true}, "setRecipient",comptroller.address);
  await execute("Comptroller", {from: borrower1, log: true}, "registerVestingContract", vestingOne.address);

  // Calculating NPV
  var calculatedNPV;

  res = await read("Comptroller", {},"vestingCalculateNPV", borrower1);

  if (!res[0].isZero()) {
    console.log('error calculating NPV - ' + res[0].toString());
  } else {
    calculatedNPV = res[1].toString();
    console.log('Calculated NPV (Raw): ' + calculatedNPV);
  }

  // Getting accountLiquidity
  var calculatedLiquidity, calculatedShortfall;

  res = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!res[0].isZero()) {
    console.log('error calculating NPV - ' + res[0].toString());
  } else {
    calculatedLiquidity = res[1].toString();
    calculatedShortfall = res[2].toString();
    console.log('Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Claim tokens and read NPV, which should not affect NPV
  await execute("Vesting", {from: borrower1, log: true}, "claim");

  res = await read("Comptroller", {},"vestingCalculateNPV", borrower1);

  if (!res[0].isZero()) {
    console.log('error calculating NPV - ' + res[0].toString());
  } else {
    calculatedNPV = res[1].toString();
    console.log('After Claim Calculated NPV (Raw): ' + calculatedNPV);
  }

  // Getting accountLiquidity
  var calculatedLiquidity, calculatedShortfall;

  res = await read("Comptroller", {},"getAccountLiquidity", borrower1);

  if (!res[0].isZero()) {
    console.log('error calculating NPV - ' + res[0].toString());
  } else {
    calculatedLiquidity = res[1].toString();
    calculatedShortfall = res[2].toString();
    console.log('After Claim Calculated Liquidity (Raw): ' + calculatedLiquidity + '  Shortfall: ' + calculatedShortfall);
  }

  // Withdraw Vesting contract
  await execute("Comptroller", {from: borrower1, log: true}, "withdrawVestingContract", vestingOne.address);

  const owner = await read("Vesting", {},"recipient");
  console.log("Old recipient (Comptroller): ", comptroller.address, " New recipient: ", owner);

  // Try borrowing which will fail
  await execute("CErc20", {from: borrower1, log: true}, "borrow", '1000000000000');
  // Get USDC balance post
  const balanceBorrowed = await read("StandardTokenMock", {}, "balanceOf", borrower1);
  console.log("Balance of USDC should be 0: ", balanceBorrowed.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });