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

  const publicKeys = {
    "0x31d04A8811f12CCA552406bc0101AD6d1Fba7192": "",   // viewer
    "0x69640770407A09B166AED26B778699045B304768": "02012dc774b33c34f5bd9d22aadc5599b1d46f414637023972be75ddc184f1b676", // test viewer
    "0x4506F70e253DEccCC1a419954606cB3D1E6a9a70": "03cc7d57c51fe62090ddc345e0358cc820e9359e7e0f9b4cfb1df84a498c46e7f8",   // Chainlink Rinkeby Node 1
    "0xAe76Be2fbCca75B039e42DEDDE12dd305f9FCdCe": "026d93aec02db1f0cc8c69da667ba935c6618b6137bfecf9bdee2b044a44751a74"    // dApp Server
  }
  // const viewer = "0x31d04A8811f12CCA552406bc0101AD6d1Fba7192";
  const viewer = "0x69640770407A09B166AED26B778699045B304768"
  const node = "0x4506F70e253DEccCC1a419954606cB3D1E6a9a70";
  const dapp = "0xAe76Be2fbCca75B039e42DEDDE12dd305f9FCdCe";

  console.log("setting known node and dapp public keys");
  let tx = await proxy.adminSetPublicKey(Buffer.from(publicKeys[node], 'hex'), node); // node
  await tx.wait();
  tx = await proxy.adminSetPublicKey(Buffer.from(publicKeys[dapp], 'hex'), node); // dapp  
  await tx.wait();
  console.log("setting test client public key");
  tx = await proxy.adminSetPublicKey(Buffer.from(publicKeys[viewer], 'hex'), node); // viewer
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





