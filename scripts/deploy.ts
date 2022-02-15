import {CompoundFixture} from "../utils/fixtures/compoundFixture"
import {ethers} from "hardhat";

const hre = require("hardhat");

async function main() {

    //hre.
    const compoundFixture = new CompoundFixture()

    // We get the contract to deploy
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, Hardhat!");
  
    console.log("Greeter deployed to:", greeter.address);
  }
  

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});