// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const RainfallSRO = require("../SROs/rainfall_basket_sro.json");
const DeployedContracts = require(process.cwd()+"/logs/deployments.json");
const fs = require("fs");
// const CriticalSnowSRO = require("../SROs/Dallas_Mavs_Snow_Protection_21-22_Season.json")

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const DerivativeProvider = await hre.ethers.getContractFactory("DerivativeProvider");
  var derivative_provider = null;

  if ("DerivativeProvider" in DeployedContracts) {
    provider_address = DeployedContracts.DerivativeProvider;
    derivative_provider = await DerivativeProvider.attach(provider_address);
    console.log("DerivativeProvider already deployed to:", provider_address);
    
  } else {
    derivative_provider = await DerivativeProvider.deploy();
    await derivative_provider.deployed();
    console.log("DerivativeProvider deployed to:", derivative_provider.address);

    DeployedContracts["DerivativeProvider"] = derivative_provider.address

    var deployment_content = JSON.stringify(DeployedContracts);

    fs.writeFile(process.cwd()+"/logs/deployments.json", deployment_content, "utf8", function (err) {
      if (err) {
        console.log("error writing to json");
        return console.log(err)
      }
    });
  }

  try {
    await hre.run("verify:verify", {
      address: derivative_provider.address,
    });
    console.log("DerivativeProvider source code verified");
  } catch (error) {
    console.log("DerivativeProvider source code already verified");
  }

  // for (const contract of RainfallSRO.__config__.contracts) {
  contract = RainfallSRO.__config__.contracts[0];

  console.log("Minting new ClimateOption contract");

  var id = contract.__config__.id;
  var opt_type = contract.__config__.payouts.__config__.derivative.__config__.opt_type;
  var dataset = contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.dataset_name;
  var strike = parseInt(contract.__config__.payouts.__config__.derivative.__config__.strike * 100);
  var exhaust = parseInt(contract.__config__.payouts.__config__.derivative.__config__.exhaust * 100);
  var limit = parseInt(contract.__config__.payouts.__config__.derivative.__config__.limit * 100);
  var start_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.start);
  var start = parseInt(start_date.getTime() / 1000);
  var end_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.end);
  var end = parseInt(end_date.getTime() / 1000);
  const locations = [];

  for (const config of contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.loaders) {
  
    var lat = config.__config__.lat;
    var lon = config.__config__.lon;
    var location = [lat, lon];
    locations.push(location.toString())
  }
  var program;
  if (opt_type == "CALL") {
    program = "XSR";
  } else {
    program = "GRP";
  }

  // derivative_provider.on("contractCreated", (_contract, _id, event) => {
  //   console.log({
  //     result: "ClimateOption " +_id.toString() + " deployed to: " + _contract.toString(),
  //     data: event
  //   });
  // });

  let tx = await derivative_provider.newContract(id, program, dataset, opt_type, locations, start, end, strike, limit, exhaust);
  console.log(tx.hash);
  await tx.wait();

  let deployed_address = await derivative_provider.getContractAddress(0);
  console.log(deployed_address);

  try {
    await hre.run("verify:verify", {
      address: deployed_address,
    });
    console.log("ClimateOption source code verified");
  } catch (error) {
    console.error(error);
  }
  // }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
