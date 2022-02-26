const {ether} = require("../utils/common/unitsUtils.ts")
const {BigNumber} = require("ethers");

const initialExchangeRateMantissa = '200000000000000' // Copied from https://etherscan.io/token/0x39aa39c021dfbae8fac545936693ac917d5e7563#readContract

module.exports = async function ({ ethers, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer } = await getNamedAccounts()

  const usdcAddress = (await deployments.get("USDCMockToken")).address;
  const comptrollerAddress = (await deployments.get("Comptroller")).address;
  const interestRateModelAddress = (await deployments.get("WhitePaperInterestRateModel")).address;

  const CErc20 = await deploy("CErc20", {
    from: deployer,
    args: [usdcAddress,
      comptrollerAddress,
      interestRateModelAddress,
      initialExchangeRateMantissa,
      'Juice USDC',
      "jUSDC",
      8],
    log: true,
    deterministicDeployment: false
  });

  const currentPrice = ether(1000000000000);

  await execute('Comptroller',{from: deployer, log: true}, '_supportMarket', CErc20.address);
  await execute('SimplePriceOracle',{from: deployer, log: true}, 'setUnderlyingPrice', CErc20.address, currentPrice);
  await execute('Comptroller',{from: deployer, log: true}, '_setCollateralFactor', CErc20.address, '0');

  console.log('jUSDC deployed');
  
  await execute("USDCMockToken",{from: deployer, log: true}, 'approve', CErc20.address, ether(10000000));
  console.log("Approved USDC to fUSDC");

  // Mint $3M jUSDC
  await execute("CErc20",{from: deployer, log: true},'mint',BigNumber.from(3000000000000));
  console.log("Minted fUSDC");
  
}

module.exports.tags = ["CErc20"]
module.exports.dependencies = ["SimplePriceOracle", "Comptroller", "USDCMockToken"]
