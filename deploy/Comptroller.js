module.exports = async function ({ ethers, deployments, getNamedAccounts }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const { address } = await deploy("Comptroller", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false
  })

  const comptroller = await ethers.getContract("Comptroller")
}

module.exports.tags = ["Comptroller"]
module.exports.dependencies = ["CErc20"]
