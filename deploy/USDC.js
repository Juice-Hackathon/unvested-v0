module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  await deploy("StandardTokenMock", {
    from: deployer,
    args: [
      deployer,
      '1000000000000000000000000000',
      6,
      "USD Coin",
      "USDC",
    ],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["USDC"]
module.exports.dependencies = []