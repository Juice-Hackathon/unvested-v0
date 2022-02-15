import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {CompoundFixture} from '../utils/fixtures/compoundFixture'
import { BigNumber } from "ethers";
import {
  ether,
} from "../utils/common/unitsUtils";
import DeployHelper from "../utils/deploys";

const collateralFactor = BigNumber.from(0) // 0% LTV as we are not allowing anyone to use USDC as collateral
const currentPrice = ether(1000000000000) // Compound oracles account for decimals. $1 * 10^18 * 10^18 / 10^6 (USDC decimals)
const initialExchangeRateMantissa = BigNumber.from(200000000000000) // Copied from https://etherscan.io/token/0x39aa39c021dfbae8fac545936693ac917d5e7563#readContract

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  
  const signer = ethers.provider.getSigner(deployer);
  const deployHelper = new DeployHelper(signer);

  /*
   * PROTOCOL
   */ 
  const compoundFixture = new CompoundFixture(ethers.provider,deployer);
  await compoundFixture.initialize();

  // Deploy fake USDC
  const usdc = await deployHelper.external.deployTokenMock(
    deployer,
    ether(1000000000),
    18,
    "USD Coin",
    "USDC",
  );

  // await compoundFixture.createAndEnableCToken(
  //   usdc.address,
  //   initialExchangeRateMantissa,
  //   compoundFixture.comptroller.address,
  //   compoundFixture.interestRateModel.address,
  //   'Juice USDC',
  //   "jUSDC",
  //   6,
  //   collateralFactor,
  //   currentPrice,
  // );

  /*
   * VESTING
   */ 
  // const vestingToken = await deployHelper.external.deployTokenMock(
  //   deployer,
  //   ether(1000000000),
  //   18,
  //   "Yearn Finance",
  //   "YFI",
  // );

  // const vestingContract = await deployHelper.external.deployVesting(
  //   vestingToken,
  //   deployer, // NOTE: set recipient to deployer which can be configured to a third party later on
  //   ether(1000), // 1000 YFI vesting amount
  //   1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
  //   1644937095, // No cliff TBD
  //   1708009095 // Thursday, February 15, 2024 2:58:15 PM
  // );
};

export default func;

func.tags = ['baseProtocol'];