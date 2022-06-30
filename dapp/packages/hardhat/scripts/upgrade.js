const deployedContracts = require("../../react-app/src/contracts/hardhat_contracts.json");
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
// const { deployments } = require("hardhat-deploy");

const delay = ms => new Promise(res => setTimeout(res, ms));

const PROXY = deployedContracts["4"]["rinkeby"]["contracts"]["WeatherRiskNFT"]["address"];
const VERSION = 4
const CONTRACT = "WeatherRiskNFT"
const FQN = "contracts/upgrades/"+CONTRACT+"v"+VERSION.toString()+".sol:"+CONTRACT+"v"+VERSION.toString();


async function main() {
  try {
    const upgradedWeatherRiskNFT = await ethers.getContractFactory(FQN);
    console.log("Upgrading "+CONTRACT+"...");
    console.log("proxy: ", PROXY);
    const implementation = await upgrades.erc1967.getImplementationAddress(PROXY);
    console.log("old implementation: ", implementation);
    const proxy = await upgrades.upgradeProxy(PROXY, upgradedWeatherRiskNFT, {
      kind: 'uups',
      unsafeAllow: ['delegatecall']
    });
    await delay(10*1000);
    const newImplementation = await upgrades.erc1967.getImplementationAddress(proxy.address);
    console.log("new implementation: ", newImplementation);

    const artifact = fs.readFileSync(__dirname+"/../artifacts/"+FQN.replace(":", "/")+".json");
    deployedContracts["4"]["rinkeby"]["contracts"]["WeatherRiskNFT"]["abi"] = JSON.parse(artifact.toString()).abi;
    fs.writeFileSync(__dirname+"/../../react-app/src/contracts/hardhat_contracts.json", JSON.stringify(deployedContracts));
    await delay(10*1000);

    console.log("trying to verify");
    try {
      await run("verify:verify", {
        address: newImplementation,
        contract: FQN,
        constructorArguments: [],
      });
    } catch (error) {
      console.error(error);
    }

    console.log(CONTRACT+" upgraded successfully");
  } catch (e) {
    console.log(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




