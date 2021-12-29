const hre = require("hardhat");
const RainfallSRO1 = require("../../../chainlink_node/adapter/tests/SROs/Cambodia_rain_basket_August21-December21.json");
const RainfallSRO2 = require("../../../chainlink_node/adapter/tests/SROs/Cambodia_rain_basket_December21-April22.json");
const ContractList = RainfallSRO1.__config__.contracts.concat([RainfallSRO2]);
const Providers = require(process.cwd()+"/logs/providers.json");
const Contracts = require(process.cwd()+"/logs/contracts.json");
const fs = require("fs");

async function main() {

  const CubanBlizzardDerivativeProvider = await hre.ethers.getContractFactory("CubanBlizzardDerivativeProvider");
  var derivative_provider = null;

  if ("CubanBlizzardDerivativeProvider" in Providers) {
    provider = Providers.CubanBlizzardDerivativeProvider;
    derivative_provider = await CubanBlizzardDerivativeProvider.attach(provider.address);
    console.log("CubanBlizzardDerivativeProvider already deployed to:", provider.address);
  } else {
    derivative_provider = await CubanBlizzardDerivativeProvider.deploy();
    await derivative_provider.deployed();
    var address = derivative_provider.address;
    console.log("CubanBlizzardDerivativeProvider deployed to:", address);

    var owner = await derivative_provider.owner();
    console.log("Owner:", owner);
    var tx = await derivative_provider.addAccess(owner);
    await tx.wait();
    var access = await derivative_provider.hasAccess(owner, 64);
    console.log("Access granted:", access);

    var collateral = await derivative_provider.COLLATERAL_ADDRESS();
    console.log("Collateral provider:", collateral);
    var tx = await derivative_provider.addAccess(collateral);
    await tx.wait();
    var access = await derivative_provider.hasAccess(collateral, 64);
    console.log("Access granted:", access);

    var premium = await derivative_provider.PREMIUM_ADDRESS();
    console.log("Premium provider:", premium);

    var tx = await derivative_provider.addAccess(premium);
    await tx.wait();
    var access = await derivative_provider.hasAccess(premium, 64);
    console.log("Access granted:", access);

    Providers["CubanBlizzardDerivativeProvider"] = {"address": address, "verified": false, "contracts": {}};
    var deployment_content = JSON.stringify(Providers);
    try {
      fs.writeFileSync(process.cwd()+"/logs/providers.json", deployment_content)
    } catch (error) {
      console.error(error)
    }
  }

  const RainfallDerivativeProvider = await hre.ethers.getContractFactory("RainfallDerivativeProvider");
  var derivative_provider = null;

  if ("RainfallDerivativeProvider" in Providers) {
    provider = Providers.RainfallDerivativeProvider;
    derivative_provider = await RainfallDerivativeProvider.attach(provider.address);
    console.log("RainfallDerivativeProvider already deployed to:", derivative_provider.address);
  } else {
    derivative_provider = await RainfallDerivativeProvider.deploy();
    await derivative_provider.deployed();
    console.log("RainfallDerivativeProvider deployed to:", derivative_provider.address);
  }
  var contracts = {};
  try {
    for (const contract of ContractList) {
      var id = contract.__config__.id.toString();
      if (id in Contracts) {
        console.log("RainfallOption already deployed to:", Contracts[id].address);
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
        await tx.wait();

        var deployed_address = await derivative_provider.getContractAddress(id);
        const RainfallOption = await hre.ethers.getContractFactory("RainfallOption");
        var rainfall_option = await RainfallOption.attach(deployed_address);
        console.log("RainfallOption deployed to:", rainfall_option.address);

        Contracts[id] = {"address": rainfall_option.address, "verified": false, "provider": derivative_provider.address, "end": end};
        contracts[id] = deployed_address;
      }
    }
    var final_content = JSON.stringify(Contracts);
    try {
      fs.writeFileSync(process.cwd()+"/logs/contracts.json", final_content)
    } catch (error) {
      console.error(error)
    }
  } catch (error) {
    console.error(error)
  }
  Providers["RainfallDerivativeProvider"] = {"address": derivative_provider.address, "verified": false, "contracts": contracts};
  var deployment_content = JSON.stringify(Providers);
  try {
    fs.writeFileSync(process.cwd()+"/logs/providers.json", deployment_content)
  } catch (error) {
    console.error(error)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
