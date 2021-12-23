const hre = require("hardhat");
const DeployedContracts = require(process.cwd()+"/logs/deployments.json");

async function main() {

  for (const [name, address] of Object.entries(DeployedContracts)) {
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