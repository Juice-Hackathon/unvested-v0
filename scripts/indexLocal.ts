import { ethers, getNamedAccounts} from "hardhat";
import { BigNumber } from "ethers";

const addresses = {
  comptroller: '0x871DD7C2B4b25E1Aa18728e9D5f2Af4C4e431f5c',
  unitroller: '0x1D7022f5B17d2F8B695918FB48fa1089C9f85401',
  priceOracle: '0x1dC4c1cEFEF38a777b15aA20260a54E584b16C48',
  interestRateModel: '0xcdB594a32B1CC3479d8746279712c39D18a07FC0',
  usdc: '0x1E2F9E10D02a6b8F8f69fcBf515e75039D2EA30d',
  ctoken: '0xbe0037eAf2d64fe5529BCa93c18C9702D3930376',
  vestingToken: '0xF22469F31527adc53284441bae1665A7b9214DBA',
  vestingContract: '0x10aDd991dE718a69DeC2117cB6aA28098836511B'
};


async function main() {

  const {deployer, lender} = await getNamedAccounts();

  const CToken = await ethers.getContractFactory('CErc20', lender);
  const cToken = CToken.attach(addresses.ctoken);


  const mintResult = await cToken.mint(BigNumber.from(10000000));

  if (mintResult == 0) {
    console.log('minted');
  } else {
    console.log('mint failed');
  }



}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });