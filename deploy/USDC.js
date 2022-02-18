const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer } = await getNamedAccounts();

  await deploy("StandardTokenMock", {
    from: deployer,
    args: [
      deployer,
      ether(1000000000),
      "USD Coin",
      "USDC",
      6,
    ],
    log: true,
    deterministicDeployment: false
  });

  console.log('USDC deployed');
}

module.exports.tags = ["USDC"]
module.exports.dependencies = []