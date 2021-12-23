const hre = require("hardhat");
const Providers = require(process.cwd()+"/logs/providers.json");
const Contracts = require(process.cwd()+"/logs/contracts.json");

async function main() {

  for (const [name, address] of Object.entries(Providers)) {
    try {
      await hre.run("verify:verify", {
        address: address,
      });
      console.log(name.toString() + " source code verified");
    } catch (error) {
      console.error(error);
    }
  }

  for (const [name, address] of Object.entries(Contracts)) {
    try {
      await hre.run("verify:verify", {
        address: address,
      });
      console.log(name.toString() + " source code verified");
    } catch (error) {
      console.error(error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});