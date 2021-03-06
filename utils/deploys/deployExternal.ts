import { BigNumberish, BigNumber, Signer } from "ethers";

import {
  CErc20,
  Comptroller,
  SimplePriceOracle,
  PriceOracle,
  StandardTokenMock,
  Unitroller,
  WhitePaperInterestRateModel,
  Vesting
} from "./../contracts/compound";

import { Address } from "./../types";

import { CErc20__factory } from "../../typechain/factories/CErc20__factory";
import { Comptroller__factory } from "../../typechain/factories/Comptroller__factory";
import { Unitroller__factory } from "../../typechain/factories/Unitroller__factory";
import { WhitePaperInterestRateModel__factory } from "../../typechain/factories/WhitePaperInterestRateModel__factory";
import { StandardTokenMock__factory } from "../../typechain/factories/StandardTokenMock__factory";

import { SimplePriceOracle__factory } from "../../typechain/factories/SimplePriceOracle__factory";

import { Vesting__factory } from "../../typechain/factories/Vesting__factory";


export default class DeployExternalContracts {
  private _deployerSigner: Signer;

  constructor(deployerSigner: Signer) {
    this._deployerSigner = deployerSigner;
  }

  // COMPOUND

  //public async deployCompoundTimelock(_admin: Address, _delay: BigNumber): Promise<CompoundTimelock> {
  //  return await new CompoundTimelock__factory(this._deployerSigner).deploy(_admin, _delay);
  //}


  public async deployCeRc20(
    underlying: Address,
    comptroller: Address,
    interestRateModel: Address,
    initialExchangeRateMantissa: BigNumberish,
    name: string,
    symbol: string,
    decimals: BigNumberish
  ): Promise<CErc20> {
    return await new CErc20__factory(this._deployerSigner).deploy();
  }

  public async deploySimplePriceOracle(): Promise<SimplePriceOracle> {
    return await new SimplePriceOracle__factory(this._deployerSigner).deploy();
  }

  public async deployComptroller(): Promise<Comptroller> {
    return await new Comptroller__factory(this._deployerSigner).deploy();
  }

  public async deployUnitroller(): Promise<Unitroller> {
    return await new Unitroller__factory(this._deployerSigner).deploy();
  }

  public async deployWhitePaperInterestRateModel(
    baseRate: BigNumberish,
    multiplier: BigNumberish
  ): Promise<WhitePaperInterestRateModel> {
    return await new WhitePaperInterestRateModel__factory(this._deployerSigner).deploy(baseRate, multiplier);
  }

  public async deployTokenMock(
    initialAccount: Address,
    initialBalance: BigNumberish,
    decimals: BigNumberish = 18,
    name: string = "Token",
    symbol: string = "Symbol"
  ): Promise<StandardTokenMock> {
    return await new StandardTokenMock__factory(this._deployerSigner)
      .deploy(initialAccount, initialBalance, name, symbol, decimals);
  }

  public async deployVesting(
    vestingToken: Address,
    recipient: Address,
    vestingAmount: BigNumberish,
    vestingBegin: number,
    vestingCliff: number,
    vestingEnd: number
  ): Promise<Vesting> {
    return await new Vesting__factory(this._deployerSigner)
      .deploy(
        vestingToken,
        recipient,
        vestingAmount,
        vestingBegin,
        vestingCliff,
        vestingEnd
      );
  }
}
