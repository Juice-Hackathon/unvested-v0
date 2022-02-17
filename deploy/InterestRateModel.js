module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  await deploy("WhitePaperInterestRateModel", {
    from: deployer,
    args: ['1000000000000000000', '1000000000000000000'],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["WhitePaperInterestRateModel"]
module.exports.dependencies = []
