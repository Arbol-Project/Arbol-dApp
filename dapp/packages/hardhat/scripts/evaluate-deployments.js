const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ProviderLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/providers.json");
const ContractLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/contracts.json");
const Providers = require(ProviderLogs);
const Contracts = require(ContractLogs);
// const abis = require(path.join(process.cwd(), "../../web_app/packages/contracts/src/abi.js"));
const delay = ms => new Promise(res => setTimeout(res, ms));


async function main() {

  // const [defaultSigner] = await hre.ethers.getSigners();

    for (const [pname, pdata] of Object.entries(Providers)) {
      const DerivativeProvider = await hre.ethers.getContractFactory(pname);
      var derivative_provider = await DerivativeProvider.attach(pdata.address);

      const Operator = await hre.ethers.getContractFactory("Operator");
      // const Link = new Contract(, abis.erc20, defaultSigner);


      // const defaultProvider = hre.ethers.getDefaultProvider();
      // const [defaultSigner] = await hre.ethers.getSigners();
      // var LinkAddress;
    
      // const link = new Contract(LinkAddress, abis.erc20, defaultSigner);

      // var today = new Date();
      // var cutoff;
      // if (today.getDate() > 16) {
        // cutoff = new Date(today.getYear()+1900, today.getMonth(), 0);
      // } else {
        // if (today.getMonth() == 0) {
          // cutoff = new Date(today.getYear()-1+1900, 11, 0);
        // } else {
          // cutoff = new Date(today.getYear()+1900, today.getMonth()-1, 0);
      //   }
      // }      

      for (const [cname, caddr] of Object.entries(pdata.contracts)) {
    
        // var end_date = new Date(Contracts[cname].end);

        // console.log(end_date, cutoff);
        //  && end_date.getTime() < cutoff.getTime()
        if (caddr == Contracts[cname].address) {
          if (Contracts[cname].evaluated) {
            continue;
          }
          console.log("Initiating contract evaluation for:", cname);
          if (pname == "RainfallDerivativeProvider") {
            var optionAddress = derivative_provider.contracts(cname);
            const OptionContract = await hre.ethers.getContractFactory("RainfallOption");
            var option_contract = OptionContract.attach(optionAddress);
            var operator_address = await option_contract.ARBOL_ORACLE();
            var whitelistingOperator= await Operator.attach(operator_address);
            var access = await whitelistingOperator.hasAccess(optionAddress, 64);
            console.log("access:", access);
            if (!access) {
              console.log("Adding operator access");
              var tx = await whitelistingOperator.addAccess(optionAddress);
              console.log("tx hash:", tx.hash);
              await tx.wait();
              console.log("???");
            }
            // console.log("replacing job with long version");
            // var long_job = "607f1d9089514a2a9eb1aa7c3db1c895";
            // tx = await derivative_provider.removeContractJob(cname, long_job);
            // console.log("tx hash:", tx.hash);
            // await tx.wait();
            // tx = await derivative_provider.addContractJob(cname, operator_address, long_job);
            // console.log("tx hash:", tx.hash);
            // await tx.wait();
            // tx = await derivative_provider.removeContractJob(cname, "ccaf1bfe97d8469caff395a0aaa61e27");
            // console.log("tx hash:", tx.hash);
            // await tx.wait();
            console.log("init eval");
            tx = await derivative_provider.initiateContractEvaluation(cname);
            console.log("tx hash:", tx.hash);
            console.log("waiting...");
            await tx.wait();
          } else if (pname == "BlizzardDerivativeProvider") {
            var optionAddress = derivative_provider.blizzardContract();
            const OptionContract = await hre.ethers.getContractFactory("BlizzardOption");
            var option_contract = OptionContract.attach(optionAddress);
            var operator_address = await option_contract.ARBOL_ORACLE();
            var whitelistingOperator= await Operator.attach(operator_address);
            var tx = await whitelistingOperator.addAccess(optionAddress);
            console.log("tx hash:", tx.hash);
            await tx.wait();

            tx = await derivative_provider.initiateContractEvaluation();
            console.log("tx hash:", tx.hash);
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
            var retries = 0;
            while (!evaluated) {
              if (retries > 1) {
                break;
              }
              retries += 1;
              console.log("Waiting 5 more minutes...");
              await delay(300*1000);
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
        }
        var deployment_content = JSON.stringify(Contracts);
        try {
          fs.writeFileSync(ContractLogs, deployment_content)
        } catch (error) {
          console.error(error)
        }
      }
  }
  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});