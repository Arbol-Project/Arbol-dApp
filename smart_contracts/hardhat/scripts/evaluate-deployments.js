const hre = require("hardhat");
const Providers = require(process.cwd()+"/logs/providers.json");
const Contracts = require(process.cwd()+"/logs/contracts.json");
const fs = require("fs");
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {

    for (const [pname, pdata] of Object.entries(Providers)) {
      const DerivativeProvider = await hre.ethers.getContractFactory(pname);
      var derivative_provider = await DerivativeProvider.attach(pdata.address);
      
      for (const [cname, caddr] of Object.entries(pdata.contracts)) {
        if (caddr == Contracts[cname].address && Contracts[cname].end < parseInt(Date.now() / 1000)) {
          if (Contracts[cname].evaluated) {
            continue;
          }
          console.log("Initiating contract evaluation for:", cname);
          if (pname == "RainfallDerivativeProvider") {
            var tx = await derivative_provider.initiateContractEvaluation(cname);
            console.log("waiting...");
            await tx.wait();
          } else if (pname == "CubanBlizzardDerivativeProvider") {
            var tx = await derivative_provider.initiateContractEvaluation();
            console.log("Waiting...");
            await tx.wait();
          }
          console.log("(1 minute)");
          await delay(60*1000);
          var evaluated = await derivative_provider.getContractEvaluated(cname);
          if (evaluated) {
            var payout = await derivative_provider.getContractPayout(cname);
            payout = payout.toString();
            console.log("Contract:", cname, "Payout:", payout.slice(0, -2) + "." + payout.slice(-2));

            Contracts[cname].evaluated = true;
            Contracts[cname].payout = payout;
          } else {
            console.log("Contract evaluation undetermined:", cname);
          }
        }
        var deployment_content = JSON.stringify(Contracts);
        try {
          fs.writeFileSync(process.cwd()+"/logs/contracts.json", deployment_content)
        } catch (error) {
          console.error(error)
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