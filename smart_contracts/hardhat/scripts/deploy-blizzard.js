const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ProviderLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/providers.json");
const ContractLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/contracts.json");
const Providers = require(ProviderLogs);
const Contracts = require(ContractLogs);


async function main() {

  const BlizzardDerivativeProvider = await hre.ethers.getContractFactory("BlizzardDerivativeProvider");
  var derivative_provider = null;

  if ("BlizzardDerivativeProvider" in Providers) {
    provider = Providers.BlizzardDerivativeProvider;
    derivative_provider = await BlizzardDerivativeProvider.attach(provider.address);
    console.log("BlizzardDerivativeProvider already deployed to:", provider.address);
  } else {
    derivative_provider = await BlizzardDerivativeProvider.deploy();
    await derivative_provider.deployed();
    var address = derivative_provider.address;
    console.log("BlizzardDerivativeProvider deployed to:", address);

    var owner = await derivative_provider.owner();
    console.log("Owner:", owner);
    var tx = await derivative_provider.addAccess(owner);
    await tx.wait();
    var access = await derivative_provider.hasAccess(owner, 64);
    console.log("Access granted:", access);

    var collateral = await derivative_provider.COLLATERAL_ADDRESS();
    console.log("Collateral provider:", collateral);
    tx = await derivative_provider.addAccess(collateral);
    await tx.wait();
    access = await derivative_provider.hasAccess(collateral, 64);
    console.log("Access granted:", access);

    var premium = await derivative_provider.PREMIUM_ADDRESS();
    console.log("Premium provider:", premium);

    tx = await derivative_provider.addAccess(premium);
    await tx.wait();
    access = await derivative_provider.hasAccess(premium, 64);
    console.log("Access granted:", access);

    tx = await derivative_provider.deployVerificationContract();
    await tx.wait();
    var deployed_address = await derivative_provider.getVerificationAddress();

    console.log("Deployed blueprint contract for verification");
    console.log(deployed_address);

    Providers["BlizzardDerivativeProvider"] = {"address": address, "types": {"BlizzardOption": false},  "verified": false, "contracts": {"BlizzardOptionTest": deployed_address}};
    var deployment_content = JSON.stringify(Providers);
    try {
      fs.writeFileSync(ProviderLogs, deployment_content)
    } catch (error) {
      console.error(error)
    }

    Contracts["BlizzardOptionTest"] = {"type": "BlizzardOption", "address": deployed_address, "verified": false, "provider": "BlizzardDerivativeProvider", "end": "2022-01-01", "evaluated": true, "payout": "0"};
    deployment_content = JSON.stringify(Contracts);
    try {
      fs.writeFileSync(ContractLogs, deployment_content)
    } catch (error) {
      console.error(error)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
