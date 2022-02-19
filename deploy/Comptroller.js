module.exports = async function ({ ethers, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer } = await getNamedAccounts()

  const simplePriceOracle = await deployments.get("SimplePriceOracle");
  const comptrollerResult = await deploy("Comptroller", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  });

  await execute('Comptroller',{from: deployer, log: true}, '_setPriceOracle', simplePriceOracle.address);
  await execute('Comptroller',{from: deployer, log: true}, '_setMaxAssets', 10);
  await execute('Comptroller',{from: deployer, log: true}, '_setCloseFactor', '500000000000000000');
  await execute('Comptroller',{from: deployer, log: true}, '_setLiquidationIncentive', '1080000000000000000');
  

  console.log('comptroller deployed');
}

module.exports.tags = ["Comptroller"]
module.exports.dependencies = ["SimplePriceOracle"]