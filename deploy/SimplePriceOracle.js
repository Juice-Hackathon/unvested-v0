module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  await deploy("SimplePriceOracle", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  })

  console.log('price oracle deployed');
}

module.exports.tags = ["SimplePriceOracle"]
module.exports.dependencies = []
