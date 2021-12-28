const hre = require("hardhat");
const Providers = require(process.cwd()+"/logs/providers.json");
const Contracts = require(process.cwd()+"/logs/contracts.json");
const fs = require("fs");

async function main() {
    
    for (const [pname, pdata] of Object.entries(Providers)) {
      const DerivativeProvider = await hre.ethers.getContractFactory(pname);
      derivative_provider = await DerivativeProvider.attach(pdata["address"]);
      
      for (const [cname, caddr] of Object.entries(derivative_provider["contracts"])) {
        if (caddr == Contracts[cname].address && Contracts[cname].end < parseInt(Date.now() / 1000)) {
          console.log("Initiating contract evaluation for:", cname);
          if (pname == "RainfallDerivativeProvider") {
            var tx = await derivative_provider.initiateContractEvaluation(cname);
            await tx.wait();
          } else if (pname == "CubanBlizzardDerivativeProvider") {
            var tx = await derivative_provider.initiateContractEvaluation();
            await tx.wait();
          }
          // var payout = await derivative_provider.getContractPayout(cname);
        }
      }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});