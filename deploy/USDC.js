const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer, lender, borrower1, borrower2 } = await getNamedAccounts();

  await deploy("USDCMockToken", {
    from: deployer,
    args: [
      deployer,
      '10000000000000',
      "USD Coin",
      "USDC",
      6,
    ],
    log: true,
    deterministicDeployment: false
  });

  // Transfer extra 1000 USDC to borrowers
  await execute('USDCMockToken',{from: deployer, log: true}, 'transfer', "0xbA8EC1F5eE094912266fbCCa6331DfF6F1A719F1", '1000000000');

  console.log('USDC deployed');
}

module.exports.tags = ["USDC"]
module.exports.dependencies = []