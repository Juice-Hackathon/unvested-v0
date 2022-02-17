module.exports = async function ({ ethers, getNamedAccounts, getChainId, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const simplePriceOracle = await getContract("SimplePriceOracle")
  const comptroller = await deploy("Comptroller", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  })

  await comptroller._setPriceOracle(simplePriceOracle.address);
  await comptroller._setMaxAssets(10);
  await comptroller._setCloseFactor('5000000000000000000');
  await comptroller._setLiquidationIncentive('1080000000000000000');
}

module.exports.tags = ["Comptroller"]
module.exports.dependencies = ["SimplePriceOracle"]