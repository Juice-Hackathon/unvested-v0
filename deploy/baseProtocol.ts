import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {CompoundFixture} from '../utils/fixtures/compoundFixture'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const compoundFixture = new CompoundFixture(ethers.provider,deployer);

  compoundFixture.initialize();

  //compoundFixture.createAndEnableCToken();

};

export default func;

func.tags = ['baseProtocol'];