module.exports = async function ({ ethers, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer } = await getNamedAccounts()

  const simplePriceOracle = await deployments.get("SimplePriceOracle");
  const chainlinkPriceOracle = await deployments.get("ChainlinkPriceOracle");
  const comptrollerResult = await deploy("Comptroller", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  });

  const chainId = await getChainId();
  const oracleToUse = chainId.toString() == '31337' ? simplePriceOracle.address : chainlinkPriceOracle.address;
  // Change this to chainlink price oracle when on Kovan. For all other networks change to simple oracle
  await execute('Comptroller',{from: deployer, log: true}, '_setPriceOracle', oracleToUse);
  await execute('Comptroller',{from: deployer, log: true}, '_setMaxAssets', 10);
  await execute('Comptroller',{from: deployer, log: true}, '_setCloseFactor', '500000000000000000');
  await execute('Comptroller',{from: deployer, log: true}, '_setLiquidationIncentive', '1080000000000000000');
  

  console.log('comptroller deployed');
}

module.exports.tags = ["Comptroller"]
module.exports.dependencies = ["SimplePriceOracle", "ChainlinkPriceOracle"]