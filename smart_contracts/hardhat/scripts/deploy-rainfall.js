const hre = require("hardhat");
const RainfallSRO1 = require("../SROs/Cambodia_rain_basket_August21-December21.json");
const RainfallSRO2 = require("../SROs/Cambodia_rain_basket_December21-April22.json");
const DeployedContracts = require(process.cwd()+"/logs/deployments.json");
const fs = require("fs");

async function main() {

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

  for (const contract of RainfallSRO1.__config__.contracts) {
    var id = contract.__config__.id.toString();
    if (id in DeployedContracts) {
      console.log("RainfallOption already deployed to:", DeployedContracts[id]);
      continue;
    } else {
      var opt_type = contract.__config__.payouts.__config__.derivative.__config__.opt_type.toString();
      var dataset = contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.dataset_name.toString();
      var strike = contract.__config__.payouts.__config__.derivative.__config__.strike;
      var limit = contract.__config__.payouts.__config__.derivative.__config__.limit;
      var tick = contract.__config__.payouts.__config__.derivative.__config__.tick;
      var start_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.start);
      var start = parseInt(start_date.getTime() / 1000);
      var end_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.end);
      var end = parseInt(end_date.getTime() / 1000);
      var parameters = [id, dataset, opt_type, start.toString(), end.toString(), strike.toString(), limit.toString(), tick.toString()]
      var locations = [];
      for (const config of contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.loaders) {
        var lat = config.__config__.lat;
        var lon = config.__config__.lon;
        var location_str = "[" + lat.toString() + ", " + lon.toString() + "]";
        locations.push(location_str);
      }

      var tx = await derivative_provider.newContract(locations, parameters, end);
      var receipt = await tx.wait();
      console.log(receipt.logs)

      var deployed_address = await derivative_provider.getContractAddress(id);
      const RainfallOption = await hre.ethers.getContractFactory("RainfallOption");
      rainfall_option = await RainfallOption.attach(deployed_address);
      console.log("RainfallOption deployed to:", deployed_address);

      DeployedContracts[id] = deployed_address;
      var deployment_content = JSON.stringify(DeployedContracts);
      fs.writeFile(process.cwd()+"/logs/deployments.json", deployment_content, "utf8", function (err) {
        if (err) {
          console.log("error writing to json");
          return console.log(err)
        }
      });
    }
  }

  for (const contract of RainfallSRO2.__config__.contracts) {
    var id = contract.__config__.id.toString();
    if (id in DeployedContracts) {
      console.log("RainfallOption already deployed to:", DeployedContracts[id]);
      continue;
    } else {
      var opt_type = contract.__config__.payouts.__config__.derivative.__config__.opt_type.toString();
      var dataset = contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.dataset_name.toString();
      var strike = contract.__config__.payouts.__config__.derivative.__config__.strike;
      var limit = contract.__config__.payouts.__config__.derivative.__config__.limit;
      var tick = contract.__config__.payouts.__config__.derivative.__config__.tick;
      var start_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.start);
      var start = parseInt(start_date.getTime() / 1000);
      var end_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.end);
      var end = parseInt(end_date.getTime() / 1000);
      var parameters = [id, dataset, opt_type, start.toString(), end.toString(), strike.toString(), limit.toString(), tick.toString()]
      var locations = [];
      for (const config of contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.loaders) {
        var lat = config.__config__.lat;
        var lon = config.__config__.lon;
        var location_str = "[" + lat.toString() + ", " + lon.toString() + "]";
        locations.push(location_str);
      }

      var tx = await derivative_provider.newContract(locations, parameters, end);
      var receipt = await tx.wait();
      console.log(receipt.logs)

      var deployed_address = await derivative_provider.getContractAddress(id);
      const RainfallOption = await hre.ethers.getContractFactory("RainfallOption");
      rainfall_option = await RainfallOption.attach(deployed_address);
      console.log("RainfallOption deployed to:", deployed_address);

      DeployedContracts[id] = deployed_address;
      var deployment_content = JSON.stringify(DeployedContracts);
      fs.writeFile(process.cwd()+"/logs/deployments.json", deployment_content, "utf8", function (err) {
        if (err) {
          console.log("error writing to json");
          return console.log(err)
        }
      });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
