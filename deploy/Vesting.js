const { executionAsyncResource } = require("async_hooks");
const {ether} = require("../utils/common/unitsUtils.ts")

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy, execute } = deployments

  const { deployer } = await getNamedAccounts();

  const yfi = await deploy("YearnMockToken", {
    from: deployer,
    args: [
      deployer,
      ether(1000000000),
      "Yearn Finance",
      "YFI",
      6,
    ],
    log: true,
    deterministicDeployment: false
  });

  const vesting = await deploy("Vesting", {
    from: deployer,
    args: [
      yfi.address,
      deployer, // NOTE: set recipient to deployer which can be configured to a third party later on
      ether(1000), // 1000 YFI vesting amount
      1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
      1644937095, // No cliff TBD
      1708009095 // Thursday, February 15, 2024 2:58:15 PM
    ],
    log: true,
    deterministicDeployment: false
  });

  // Transfer 1000 YFI to vesting contract
  await execute('YearnMockToken',{from: deployer, log: true}, 'transfer', vesting.address, ether(1000));
}

module.exports.tags = ["Vesting"]
module.exports.dependencies = []