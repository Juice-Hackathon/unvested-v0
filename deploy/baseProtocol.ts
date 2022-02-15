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
};

export default func;

func.tags = ['baseProtocol'];