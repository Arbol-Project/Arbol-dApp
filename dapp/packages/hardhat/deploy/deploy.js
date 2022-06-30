// deploy/00_deploy_your_contract.js

const { ethers, upgrades } = require("hardhat");

const delay = ms => new Promise(res => setTimeout(res, ms));

const CONTRACT = "WeatherRiskNFT";
const FQN = "contracts/"+CONTRACT+".sol:"+CONTRACT;

module.exports = async ({ deployments }) => {
  const { save } = deployments;

  const WeatherRiskNFT = await ethers.getContractFactory(FQN);
  console.log("Deploying "+CONTRACT+"...");
  const proxy = await upgrades.deployProxy(WeatherRiskNFT, {
    initializer: "initialize",
    kind: 'uups',
    unsafeAllow: ['delegatecall']
  });
  await proxy.deployed();
  console.log('Deploy '+CONTRACT+' Proxy done -> ' + proxy.address);
  const implementation = await upgrades.erc1967.getImplementationAddress(proxy.address)
  console.log('Deploy '+CONTRACT+' implementation  done -> ' + implementation);

  console.log("setting known client and provider encryption keys");

  let tx = await proxy.adminSetPubKey("", "");
  await tx.wait();
  tx = await proxy.adminSetPubKey("", "");
  await tx.wait();
  tx = await proxy.adminSetPubKey("", "");
  await tx.wait();

  const artifact = await deployments.getExtendedArtifact(FQN);
  let proxyDeployments = {
      address: proxy.address,
      ...artifact
  }

  await save(CONTRACT, proxyDeployments);
  await delay(10*1000);

  console.log("trying to verify");
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





