const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ProviderLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/providers.json");
const ContractLogs = path.join(process.cwd(), "../../web_app/packages/contracts/src/logs/contracts.json");
const Providers = require(ProviderLogs);
const Contracts = require(ContractLogs);


async function main() {

  var need_write = false;
  for (const [name, data] of Object.entries(Providers)) {
    if (data.verified) {
      continue;
    } else {
      try {
        await hre.run("verify:verify", {
          address: data.address,
        });
        data.verified = true;
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

    const source = path.join(process.cwd(), "/artifacts/contracts");
    const dest = "../../../web_app/packages/contracts/src/abis"
    (async ()=>{
      try {
        const files = await fs.promises.readdir(source);
        for (const file of files) {
          const fromDir = path.join(source, file);
  
          const abis = await fs.promises.readdir(fromDir);
          for (const abi of abis) {
            if (abi.includes(".dbg.")) {
              continue
            } else if (abi.includes(".json")) {
              const fromPath = path.join(fromDir, abi)
              const toPath = path.join(dest, abi);
              await fs.promises.rename(fromPath, toPath);
              console.log("Moved '%s'->'%s'", fromPath, toPath);
            } 
          }
        }
      }
      catch(err) {
        console.error(err);
      }
    })();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});