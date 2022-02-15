import { BigNumberish, BigNumber, providers, Signer } from "ethers";

import {
  CErc20,
  Comptroller,
  SimplePriceOracle,
  Unitroller,
  WhitePaperInterestRateModel,
} from "../contracts/compound";
import DeployHelper from "../deploys";
import {
  Address,
} from "../types";
import {
  ether,
} from "../common/unitsUtils";

export class CompoundFixture {
  private _deployer: DeployHelper;
  private _ownerAddress: Address;
  private _ownerSigner: Signer;

  public unitroller: Unitroller;
  public comptroller: Comptroller;
  public interestRateModel: WhitePaperInterestRateModel;

  public simplePriceOracle: SimplePriceOracle;

  constructor(provider: providers.Web3Provider | providers.JsonRpcProvider, ownerAddress: Address) {
    this._ownerAddress = ownerAddress;
    this._ownerSigner = provider.getSigner(ownerAddress);
    this._deployer = new DeployHelper(this._ownerSigner);
  }

  public async initialize(): Promise<void> {
    this.simplePriceOracle = await this._deployer.external.deploySimplePriceOracle();

    this.unitroller = await this._deployer.external.deployUnitroller();
    this.comptroller = await this._deployer.external.deployComptroller();
    await this.unitroller._setPendingImplementation(this.comptroller.address);
    await this.comptroller._setPriceOracle(this.simplePriceOracle.address);
    await this.comptroller._setMaxAssets(10);
    await this.comptroller._setCloseFactor(ether(0.5));
    await this.comptroller._setLiquidationIncentive(ether(1.08));

    // deploy Interest rate model
    this.interestRateModel = await this._deployer.external.deployWhitePaperInterestRateModel(
      ether(1), // To change
      ether(1), // To change
    );
  }

  public async createAndEnableCToken(
    underlying: Address,
    initialExchangeRateMantissa: BigNumberish,
    comptroller: Address = this.unitroller.address,
    interestRateModel: Address = this.interestRateModel.address,
    name: string = "CToken",
    symbol: string = "CT",
    decimals: BigNumberish = 8,
    collateralFactor: BigNumber,
    currentPrice: BigNumber
  ): Promise<CErc20> {
    let newCToken = await this._deployer.external.deployCeRc20(
      underlying,
      comptroller,
      interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
    );

    await newCToken["initialize(address,address,address,uint256,string,string,uint8)"](underlying,comptroller,interestRateModel,initialExchangeRateMantissa,name,symbol,decimals);


    await this.comptroller._supportMarket(newCToken.address);
    // Set starting price
    await this.simplePriceOracle.setUnderlyingPrice(newCToken.address, currentPrice);
    // Set starting collateral factor
    await this.comptroller._setCollateralFactor(newCToken.address, collateralFactor);

    return newCToken;
  }

}
