const hre = require("hardhat");
const Providers = require(process.cwd()+"/logs/providers.json");
const Contracts = require(process.cwd()+"/logs/contracts.json");
const fs = require("fs");
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {

    for (const [pname, pdata] of Object.entries(Providers)) {
      const DerivativeProvider = await hre.ethers.getContractFactory(pname);
      var derivative_provider = await DerivativeProvider.attach(pdata.address);
      var contracts = [];
      
      for (const [cname, caddr] of Object.entries(pdata.contracts)) {
        if (caddr == Contracts[cname].address && Contracts[cname].end < parseInt(Date.now() / 1000)) {
          if ("evaluated" in Contracts[cname]) {
            if (Contracts[cname].evaluated) {
              continue;
            }
          }
          console.log("Initiating contract evaluation for:", cname);
          if (pname == "RainfallDerivativeProvider") {
            var tx = await derivative_provider.initiateContractEvaluation(cname);
            await tx.wait();
          } else if (pname == "CubanBlizzardDerivativeProvider") {
            var tx = await derivative_provider.initiateContractEvaluation();
            await tx.wait();
          }
          contracts.push(cname);
          console.log("Waiting 60 seconds");
          await delay(60*1000);
        }
      }

      for (const name of contracts) {

        var payout = await derivative_provider.getContractPayout(name);
        payout = payout.toString();
        console.log("Contract:", name, "Payout:", payout.slice(0, -2) + "." + payout.slice(-2));
        
        Contracts[name].evaluated = true;
        Contracts[name].payout = payout;
      }
      var deployment_content = JSON.stringify(Contracts);
      try {
        fs.writeFileSync(process.cwd()+"/logs/contracts.json", deployment_content)
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