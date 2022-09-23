// deploy/00_deploy_your_contract.js

const { ethers, upgrades } = require("hardhat");
const delay = ms => new Promise(res => setTimeout(res, ms));
const CONTRACT = "WeatherRiskNFT";
const FQN = "contracts/"+CONTRACT+".sol:"+CONTRACT;

module.exports = async ({ deployments }) => {
  const { save } = deployments;

  const WeatherRiskNFT = await ethers.getContractFactory(FQN);
  console.log("deploying "+CONTRACT+"...");
  const proxy = await upgrades.deployProxy(WeatherRiskNFT, {
    initializer: "initialize",
    kind: 'uups',
    unsafeAllow: ['delegatecall']
  });
  await proxy.deployed();
  console.log('deploy '+CONTRACT+' proxy done -> ' + proxy.address);
  const implementation = await upgrades.erc1967.getImplementationAddress(proxy.address)
  console.log('deploy '+CONTRACT+' implementation  done -> ' + implementation);

  console.log("getting configs");
  const encryptionConfig = await proxy.encryptionConfig();
  console.log(encryptionConfig)
  const chainlinkConfig = await proxy.chainlinkConfig();
  console.log(chainlinkConfig)

  const artifact = await deployments.getExtendedArtifact(FQN);
  let proxyDeployments = {
      address: proxy.address,
      ...artifact
  }
  await save(CONTRACT, proxyDeployments);

  console.log("trying to verify");
  await delay(10*1000);
  try {
    await run("verify:verify", {
      address: implementation,
      contract: FQN,
      constructorArguments: [],
    });
  } catch (error) {
    console.error(error);
  }


};
module.exports.tags = [CONTRACT];





