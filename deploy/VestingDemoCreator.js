const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer, lender, borrower1, borrower2 } = await getNamedAccounts();
  const chainId = await getChainId();
  const chainlink = await deployments.get("LINKMockToken");
  const comptroller = await deployments.get("Comptroller");

  const vestingDemoCreator = await deploy("VestingDemoCreator", {
    from: deployer,
    args: [
      chainlink.address,
      comptroller.address
    ],
    log: true,
    deterministicDeployment: false
  });

  await execute('Comptroller',{from: deployer, log: true}, '_updateAllowedCaller', vestingDemoCreator.address, true);
}

module.exports.tags = ["VestingDemoCreator"]
module.exports.dependencies = ["Comptroller", "LINKMockToken"]