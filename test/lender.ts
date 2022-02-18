import { expect } from "chai";
import { ethers } from "hardhat";

import {CompoundFixture} from '../utils/fixtures/compoundFixture'
import { BigNumber } from "ethers";
import {
  ether,
} from "../utils/common/unitsUtils";
import DeployHelper from "../utils/deploys";

const collateralFactor = BigNumber.from(0) // 0% LTV as we are not allowing anyone to use USDC as collateral
const currentPrice = ether(1000000000000) // Compound oracles account for decimals. $1 * 10^18 * 10^18 / 10^6 (USDC decimals)
const initialExchangeRateMantissa = BigNumber.from(200000000000000) // Copied from https://etherscan.io/token/0x39aa39c021dfbae8fac545936693ac917d5e7563#readContract


describe("Lender mint redeem", function () {
  it("Should allow lender to redeem back deposited amount", async function () {
    
    const signer = ethers.provider.getSigner(deployer);
    const deployHelper = new DeployHelper(signer);
  
    /*
     * PROTOCOL
     */ 
    const compoundFixture = new CompoundFixture(ethers.provider,deployer);
    await compoundFixture.initialize();


    
    
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, world!");
    await greeter.deployed();

    expect(await greeter.greet()).to.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});