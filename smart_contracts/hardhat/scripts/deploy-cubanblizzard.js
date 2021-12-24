const hre = require("hardhat");
const Providers = require(process.cwd()+"/logs/providers.json");
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
    Providers["CubanBlizzardDerivativeProvider"] = {"address": address, "verified": false};
    var deployment_content = JSON.stringify(Providers);
    try {
      fs.writeFileSync(process.cwd()+"/logs/providers.json", deployment_content)
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
