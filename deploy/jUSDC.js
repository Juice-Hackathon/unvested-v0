const initialExchangeRateMantissa = '200000000000000' // Copied from https://etherscan.io/token/0x39aa39c021dfbae8fac545936693ac917d5e7563#readContract
module.exports = async function ({ ethers, getNamedAccounts, getChainId, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const usdcAddress = (await deployments.get("StandardTokenMock")).address
  const comptroller = await ethers.getContract("Comptroller")
  const interestRateModel = await ethers.getContract("WhitePaperInterestRateModel")
  const jUSDC = await deploy("CErc20", {
    from: deployer,
    args: [
      usdcAddress,
      comptroller.address,
      interestRateModel.address,
      initialExchangeRateMantissa,
      'Juice USDC',
      "jUSDC",
      8,
    ],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["CErc20"]
module.exports.dependencies = ["SimplePriceOracle", "Comptroller", "StandardTokenMock"]