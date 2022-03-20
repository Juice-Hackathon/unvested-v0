module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  await deploy("WhitePaperInterestRateModel", {
    from: deployer,
    args: ['50000000000000000', '150000000000000000'],
    log: true,
    deterministicDeployment: false
  })

  console.log('interest rate deployed');
}

module.exports.tags = ["WhitePaperInterestRateModel"]
module.exports.dependencies = []
