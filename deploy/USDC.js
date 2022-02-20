const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer, lender, borrower1, borrower2 } = await getNamedAccounts();

  await deploy("StandardTokenMock", {
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
  await execute('StandardTokenMock',{from: deployer, log: true}, 'transfer', borrower1, '1000000000');
  await execute('StandardTokenMock',{from: deployer, log: true}, 'transfer', borrower2, '1000000000');

  console.log('USDC deployed');
}

module.exports.tags = ["USDC"]
module.exports.dependencies = []