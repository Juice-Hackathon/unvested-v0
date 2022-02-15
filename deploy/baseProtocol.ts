import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {CompoundFixture} from '../utils/fixtures/compoundFixture'
import { BigNumber } from "ethers";
import {
  ether,
} from "../utils/common/unitsUtils";

const USDC = {
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Matic mainnet
  80001: "0x6D4dd09982853F08d9966aC3cA4Eb5885F16f2b2", // Matic mumbai
  42: "0x15758350DECEA0E5A96cFe9024e3f352d039905a", // Kovan
};

const collateralFactor = BigNumber.from(0) // 0% LTV as we are not allowing anyone to use USDC as collateral
const currentPrice = ether(1000000000000) // Compound oracles account for decimals. $1 * 10^18 * 10^18 / 10^6 (USDC decimals)
const initialExchangeRateMantissa = BigNumber.from(200000000000000) // Copied from https://etherscan.io/token/0x39aa39c021dfbae8fac545936693ac917d5e7563#readContract

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const compoundFixture = new CompoundFixture(ethers.provider,deployer);
  await compoundFixture.initialize();
  // await compoundFixture.createAndEnableCToken(
  //   USDC[42], // Use Kovan 
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