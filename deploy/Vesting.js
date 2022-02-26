const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")
const linkTokenPrice = {
  42: "0x396c5E36DD0a0F5a5D33dae44368D4193f69a1F0",
  421611: "0x52C9Eb2Cc68555357221CAe1e5f2dD956bC194E5",
  1666700000: "0xcd11Ac8C18f3423c7a9C9d5784B580079A75E69a",
};

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer, lender, borrower1, borrower2 } = await getNamedAccounts();
  const chainId = await getChainId();

  // Deploy LINKMockToken
  const chainlink = await deploy("LINKMockToken", {
    from: deployer,
    args: [
      deployer,
      ether(10000000),
      "Chainlink",
      "LINK",
      18,
    ],
    log: true,
    deterministicDeployment: false
  });

  // Set price for LINK in price oracle. 
  // NOTE: we are setting the direct price vs using setUnderlyingPrice as there is no cToken associated with LINK
  // LINK is 18 decimals so price is 10^18 * 10^18 / 10^18
  await execute('SimplePriceOracle',{from: deployer, log: true}, 'setDirectPrice', chainlink.address, ether(10));

  // Set Chainlink oracle for LINK token if it exists
  if (linkTokenPrice[Number(chainId)]) {
    await execute('ChainlinkPriceOracle',{from: deployer, log: true}, 'setChainlinkAggregator',  chainlink.address, linkTokenPrice[Number(chainId)]);
    await execute('ChainlinkPriceOracle',{from: deployer, log: true}, 'setDirectPrice', chainlink.address, ether(10));
  }

  console.log(chainId.toString() == '31337' ? borrower1 : "0xbA8EC1F5eE094912266fbCCa6331DfF6F1A719F1", chainId.toString())
  // Deploy VestingContracts

  const vestingOne = await deploy("Vesting", {
    from: deployer,
    args: [
      chainlink.address,
      chainId.toString() == '31337' ? borrower1 : "0xbA8EC1F5eE094912266fbCCa6331DfF6F1A719F1", // NOTE: set recipient to borrower1
      ether(1000000), // 1000000 LINK vesting amount
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
      chainlink.address,
      chainId.toString() == '31337' ? borrower2 : "0x3652588636C9D85125Fa264f794a63E3af188E03", // NOTE: set recipient to deployer which can be configured to a third party later on
      ether(900000), // 900000 LINK vesting amount
      1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
      1644937095, // No cliff TBD
      1708009095 // Thursday, February 15, 2024 2:58:15 PM
    ],
    log: true,
    deterministicDeployment: false
  });

  // Transfer 1000000 LINK to vesting contract ONE
  await execute('LINKMockToken',{from: deployer, log: true}, 'transfer', vestingOne.address, ether(1000000));
  // Transfer 900000 LINK to vesting contract TWO
  await execute('LINKMockToken',{from: deployer, log: true}, 'transfer', vestingTwo.address, ether(900000));


  // SetNPVConfig on Comptroller
  await execute('Comptroller', {from: deployer, log: true}, '_setVestingNPVConfig',
                chainlink.address,
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
module.exports.dependencies = ["SimplePriceOracle", "Comptroller"]