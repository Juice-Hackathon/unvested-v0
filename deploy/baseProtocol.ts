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

  const {deployer, lender} = await getNamedAccounts();
  
  const signer = ethers.provider.getSigner(deployer);
  const deployHelper = new DeployHelper(signer);

  /*
   * PROTOCOL
   */ 
  const compoundFixture = new CompoundFixture(ethers.provider,deployer);
  await compoundFixture.initialize();

  /*
   * USDC
   */ 


  // Deploy fake USDC
  const usdc = await deployHelper.external.deployTokenMock(
    deployer,
    ether(1000000000),
    18,
    "USD Coin",
    "USDC",
  );
  console.log("Deployed USDC", usdc.address);

  const newCToken = await compoundFixture.createAndEnableCToken(
    usdc.address,
    initialExchangeRateMantissa,
    compoundFixture.comptroller.address,
    compoundFixture.interestRateModel.address,
    'Fulcrum USDC',
    "fUSDC",
    8,
    collateralFactor,
    currentPrice,
  );
  console.log("Deployed and initialized fUSDC", newCToken.address);

  // Approve USDC
  await usdc.approve(newCToken.address, ether(10000000))
  console.log("Approved USDC to fUSDC")

  // Mint 10 cUSDC. USDC Decimals = 6
  // TODO: error re-enter revert

  //const LenderCToken = await ethers.getContractFactory("CErc20",lender);
  //const lenderCToken = LenderCToken.attach(newCToken.address);

  //await lenderCToken.mint(BigNumber.from(10000000));
  //console.log("Minted fUSDC")

  //const balanceFUSDC = await lenderCToken.balanceOf(deployer);
  
  //if (BigNumber.from(10000000) == balanceFUSDC) {
  //    console.log('balance updated');
  //} else {
  //    console.log('balance not updated, value: ' + balanceFUSDC.toString());
 // }
   
  

  /*
   * VESTING
   */ 
  const vestingToken = await deployHelper.external.deployTokenMock(
    deployer,
    ether(1000000000),
    18,
    "Yearn Finance",
    "YFI",
  );
  console.log("Deployed YFI", vestingToken.address);

  const vestingContract = await deployHelper.external.deployVesting(
    vestingToken.address,
    deployer, // NOTE: set recipient to deployer which can be configured to a third party later on
    ether(1000), // 1000 YFI vesting amount
    1644937095, // Tuesday, February 15, 2022 10:58:15 PM GMT+08:00
    1644937095, // No cliff TBD
    1708009095 // Thursday, February 15, 2024 2:58:15 PM
  );
  console.log("Deployed Vesting", vestingContract.address);

  // Transfer 1000 YFI to vesting contract
  await vestingToken.transfer(vestingContract.address, ether(1000))
  console.log("Transferred YFI to Vesting");


   /*
   * Exporting addresses
   */    

   const addresses = {
       comptroller: compoundFixture.comptroller.address,
       unitroller: compoundFixture.unitroller.address,
       priceOracle: compoundFixture.simplePriceOracle.address,
       interestRateModel: compoundFixture.interestRateModel.address,
       usdc: usdc.address,
       ctoken: newCToken.address,
       vestingToken: vestingToken.address,
       vestingContract: vestingContract.address
   }

   console.log(addresses);


   await hre.tenderly.persistArtifacts([{
      name: "Comptroller",
      address:compoundFixture.comptroller.address
    },
    {
      name: "CToken",
      address: newCToken.address
    },
    {
      name: "usdc",
      address: usdc.address
    },
    {
      name: "unitroller",
      address: compoundFixture.unitroller.address
    }
  ]);

};

export default func;

func.tags = ['baseProtocol'];