// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const RainfallSRO1 = require("../SROs/Cambodia_rain_basket_August21-December21.json");
// const RainfallSRO2 = require("../SROs/Cambodia_rain_basket_December21-April22.json");
// const BlizzardSRO = require("../SROs/Dallas_Mavs_Snow_Protection_21-22_Season.json");
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

  const RainfallDerivativeProvider = await hre.ethers.getContractFactory("RainfallDerivativeProvider");
  var derivative_provider = null;

  if ("RainfallDerivativeProvider" in DeployedContracts) {
    provider_address = DeployedContracts.RainfallDerivativeProvider;
    derivative_provider = await RainfallDerivativeProvider.attach(provider_address);
    console.log("RainfallDerivativeProvider already deployed to:", provider_address);
    
  } else {
    derivative_provider = await RainfallDerivativeProvider.deploy();
    await derivative_provider.deployed();
    console.log("RainfallDerivativeProvider deployed to:", derivative_provider.address);

    DeployedContracts["RainfallDerivativeProvider"] = derivative_provider.address
    var deployment_content = JSON.stringify(DeployedContracts);
    fs.writeFile(process.cwd()+"/logs/deployments.json", deployment_content, "utf8", function (err) {
      if (err) {
        console.log("error writing to json");
        return console.log(err)
      }
    });
  }

  // verify the contract source code if not already done
  try {
    await hre.run("verify:verify", {
      address: derivative_provider.address,
    });
    console.log("RainfallDerivativeProvider source code verified");
  } catch (error) {
    console.log("RainfallDerivativeProvider source code already verified");
  }

  // for (const contract of RainfallSRO.__config__.contracts) {
  contract = RainfallSRO1.__config__.contracts[0];
  console.log("Deploying new RainfallOption contract");

  var id = contract.__config__.id;
  var opt_type = contract.__config__.payouts.__config__.derivative.__config__.opt_type;
  var dataset = contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.dataset_name;
  var strike = contract.__config__.payouts.__config__.derivative.__config__.strike.toString();
  var limit = contract.__config__.payouts.__config__.derivative.__config__.limit.toString();
  var tick = contract.__config__.payouts.__config__.derivative.__config__.tick.toString();

  console.log(strike, limit, tick);

  // strike="123.456789", strike.length=10, strike.indexOf(".")=3, strike_decimals_decimals=6
  var strike_decimals = strike.length - 1 - strike.indexOf(".");
  var limit_decimals = limit.length - 1 - limit.indexOf(".");
  var tick_decimals = tick.length - 1 - tick.indexOf(".");

  // replace with string inputs
  strike = new hre.ethers.BigNumber.from(parseInt(strike * 10**strike_decimals));
  limit = new hre.ethers.BigNumber.from(parseInt(limit * 10**limit_decimals));
  tick = new hre.ethers.BigNumber.from(parseInt(tick * 10**tick_decimals));
  strike = strike.mnul(10**(20-strike_decimals));
  limit = limit.mnul(10**(20-limit_decimals));
  tick = tick.mnul(10**(20-tick_decimals));

  var start_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.start);
  var start = parseInt(start_date.getTime() / 1000);
  var end_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.end);
  var end = parseInt(end_date.getTime() / 1000);
  var locations = [];
  for (const config of contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.loaders) {
    var lat = config.__config__.lat;
    var lon = config.__config__.lon;
    var location = [lat, lon];
    locations.push(location.toString())
  }

  // derivative_provider.on("contractCreated", (_contract, _id, event) => {
  //   console.log({
  //     result: "ClimateOption " +_id.toString() + " deployed to: " + _contract.toString(),
  //     data: event
  //   });
  // });

  let tx = await derivative_provider.newContract(locations, id, dataset, opt_type, start, end, strike, limit, tick);
  console.log(tx.hash);
  await tx.wait();

  let deployed_address = await derivative_provider.getContractAddress(0);
  console.log(deployed_address);

  try {
    await hre.run("verify:verify", {
      address: deployed_address,
    });
    console.log("RainfallOption source code verified");
  } catch (error) {
    console.log("RainfallOption source code already verified");
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
