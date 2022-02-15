import { Signer } from "ethers";

import DeployExternalContracts from "./deployExternal";

export default class DeployHelper {
  public external: DeployExternalContracts;

  constructor(deployerSigner: Signer) {
    this.external = new DeployExternalContracts(deployerSigner);
  }
}
