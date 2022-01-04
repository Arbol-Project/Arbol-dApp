const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ProviderLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/providers.json");
const ContractLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/contracts.json");
const Providers = require(ProviderLogs);
const Contracts = require(ContractLogs);


async function main() {

  var abi_files = [];
  var need_write = true;
  for (const [name, data] of Object.entries(Providers)) {
    if (data.verified) {
      continue;
    } else {
      try {
        await hre.run("verify:verify", {
          address: data.address,
        });
        data.verified = true;
        var file_name = name + ".json";
        // slice off "Provider" from name to get base
        abi_files.push([name.slice(0, -8) + "Factory.sol/" + file_name, file_name]);
        for (const [tname, _] of Object.entries(data.types)) {
          file_name = tname + ".json";
          // slice off "Option" from type and add Derivative to get base
          abi_files.push([tname.slice(0, -6) + "DerivativeFactory.sol/" + file_name, file_name]);
        }
        need_write = true;
        console.log(name.toString() + " source code verified");
      } catch (error) {
        data.verified = true;
        console.error(error);
      }
    }
  }

  for (const [name, data] of Object.entries(Contracts)) {
    if (data.verified) {
      continue;
    } else if (Providers[data.provider].types[data.type]) {
      Contracts[name].verified = true;
      need_write = true;
      continue
    } else {
      try {
        await hre.run("verify:verify", {
          address: data.address,
        });
        data.verified = true;
        Providers[data.provider].types[data.type] = true;
        need_write = true;
        console.log(name.toString() + " source code verified");
      } catch (error) {
        data.verified = true;
        console.error(error);
      }
    }
  }

  if (need_write) {
    var deployment_content = JSON.stringify(Contracts);
    try {
      fs.writeFileSync(ContractLogs, deployment_content)
    } catch (error) {
      console.error(error)
    }
    deployment_content = JSON.stringify(Providers);
    try {
      fs.writeFileSync(ProviderLogs, deployment_content)
    } catch (error) {
      console.error(error)
    }
  }

  const source = path.join(process.cwd(), "/artifacts/contracts");
  const dest = path.join(process.cwd(), "../../web_app/packages/contracts/src/abis");
  for (const [file_path, file] of abi_files) {
    var build_path = path.join(source, file_path);
    const abi = require(build_path);
    var export_path = path.join(dest, file);
    var file_content = JSON.stringify(abi);
    try {
      fs.writeFileSync(export_path, file_content)
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