module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  await deploy("SimplePriceOracle", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  })

  // Note this address hardcodes LINK/USD oracle on Kovan. For all other networks, we should use Simple Oracle prices
  await deploy("ChainlinkPriceOracle", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  })

  console.log('price oracle deployed');
}

module.exports.tags = ["SimplePriceOracle", "ChainlinkPriceOracle"]
module.exports.dependencies = []
