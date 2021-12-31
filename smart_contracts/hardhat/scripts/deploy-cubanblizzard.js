const hre = require("hardhat");
const ProviderLogs = "../../../web_app/packages/contracts/src/logs/providers.json";
const Providers = require(ProviderLogs);
const fs = require("fs");


async function main() {

  const CubanBlizzardDerivativeProvider = await hre.ethers.getContractFactory("CubanBlizzardDerivativeProvider");
  var derivative_provider = null;

  if ("CubanBlizzardDerivativeProvider" in Providers) {
    provider = Providers.CubanBlizzardDerivativeProvider;
    derivative_provider = await CubanBlizzardDerivativeProvider.attach(provider.address);
    console.log("CubanBlizzardDerivativeProvider already deployed to:", provider.address);
  } else {
    derivative_provider = await CubanBlizzardDerivativeProvider.deploy();
    await derivative_provider.deployed();
    var address = derivative_provider.address;
    console.log("CubanBlizzardDerivativeProvider deployed to:", address);

    var owner = await derivative_provider.owner();
    console.log("Owner:", owner);
    var tx = await derivative_provider.addAccess(owner);
    await tx.wait();
    var access = await derivative_provider.hasAccess(owner, 64);
    console.log("Access granted:", access);

    var collateral = await derivative_provider.COLLATERAL_ADDRESS();
    console.log("Collateral provider:", collateral);
    var tx = await derivative_provider.addAccess(collateral);
    await tx.wait();
    var access = await derivative_provider.hasAccess(collateral, 64);
    console.log("Access granted:", access);

    var premium = await derivative_provider.PREMIUM_ADDRESS();
    console.log("Premium provider:", premium);

    var tx = await derivative_provider.addAccess(premium);
    await tx.wait();
    var access = await derivative_provider.hasAccess(premium, 64);
    console.log("Access granted:", access);

    Providers["CubanBlizzardDerivativeProvider"] = {"address": address, "types": {"CubanBlizzardOption": false},  "verified": false, "contracts": {}};
    var deployment_content = JSON.stringify(Providers);
    try {
      fs.writeFileSync(ProviderLogs, deployment_content)
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
