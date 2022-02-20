const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer, lender, borrower1, borrower2 } = await getNamedAccounts();

  // Deploy YearnMockToken
  const yfi = await deploy("YearnMockToken", {
    from: deployer,
    args: [
      deployer,
      ether(1000000000),
      "Yearn Finance",
      "YFI",
      18,
    ],
    log: true,
    deterministicDeployment: false
  });

  // Set price for YFI in price oracle. 
  // NOTE: we are setting the direct price vs using setUnderlyingPrice as there is no cToken associated with YFI
  // YFI is 18 decimals so price is 10^18 * 10^18 / 10^18
  await execute('SimplePriceOracle',{from: deployer, log: true}, 'setDirectPrice', yfi.address, ether(10000));



  // Deploy VestingContracts

  const vestingOne = await deploy("Vesting", {
    from: deployer,
    args: [
      yfi.address,
      borrower1, // NOTE: set recipient to borrower1
      ether(1000), // 1000 YFI vesting amount
      1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
      1644937095, // No cliff
      1708009095 // Thursday, February 15, 2024 2:58:15 PM
    ],
    log: true,
    deterministicDeployment: false
  });

  const vestingTwo = await deploy("VestingUserTwo", {
    from: deployer,
    args: [
      yfi.address,
      borrower2, // NOTE: set recipient to deployer which can be configured to a third party later on
      ether(100), // 100 YFI vesting amount
      1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
      1644937095, // No cliff TBD
      1708009095 // Thursday, February 15, 2024 2:58:15 PM
    ],
    log: true,
    deterministicDeployment: false
  });

  // Transfer 1000 YFI to vesting contract ONE
  await execute('YearnMockToken',{from: deployer, log: true}, 'transfer', vestingOne.address, ether(1000));
  // Transfer 100 YFI to vesting contract TWO
  await execute('YearnMockToken',{from: deployer, log: true}, 'transfer', vestingTwo.address, ether(100));


  // SetNPVConfig on Comptroller
  await execute('Comptroller', {from: deployer, log: true}, '_setVestingNPVConfig',
                yfi.address,
                15552000, // 180days in seconds: 180*24*3600  PhaseOneCutoff
                31104000, // 360days in seconds: 360*24*3600  PhaseTwoCutOff
                '900000000000000000', // 0.9 in mantissa,   PhaseOneDiscountMantissa
                '700000000000000000', // 0.7 in mantissa,   PhaseTwoDiscountMantissa
                '500000000000000000', // 0.5 in mantissa);  PhaseThreeDiscountMantissa
                '500000000000000000') // 0.5 in mantissa CollateralFactor/liduidation threshold for vesting asset collateral               


  // Set suppport collateral on Comptroller
  let res = await execute('Comptroller', {from: deployer, log:true}, '_supportCollateralVault', vestingOne.address);
  if (res == 0) {
    console.log('Supported Vesting One');
  }

  res = await execute('Comptroller', {from: deployer, log:true}, '_supportCollateralVault', vestingTwo.address);
  if (res == 0) {
    console.log('Supported Vesting Two');
  }

}

module.exports.tags = ["Vesting"]
module.exports.dependencies = ["SimplePriceOracle"]