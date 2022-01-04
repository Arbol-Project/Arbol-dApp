const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ProviderLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/providers.json");
const ContractLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/contracts.json");
const Providers = require(ProviderLogs);
const Contracts = require(ContractLogs);
const delay = ms => new Promise(res => setTimeout(res, ms));


async function main() {

    for (const [pname, pdata] of Object.entries(Providers)) {
      const DerivativeProvider = await hre.ethers.getContractFactory(pname);
      var derivative_provider = await DerivativeProvider.attach(pdata.address);
      
      for (const [cname, caddr] of Object.entries(pdata.contracts)) {
        // add two days to end to make sure data is there
        var end_date = new Date(Contracts[cname].end);
        var end_time = end_date.getTime();
        if (caddr == Contracts[cname].address && (end_time + 1000*60*60*24*2) < parseInt(Date.now())) {
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
            console.log("Waiting 4 more minutes...");
            await delay(60*1000);
            evaluated = await derivative_provider.getContractEvaluated(cname);

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
        }
        var deployment_content = JSON.stringify(Contracts);
        try {
          fs.writeFileSync(ContractLogs, deployment_content)
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