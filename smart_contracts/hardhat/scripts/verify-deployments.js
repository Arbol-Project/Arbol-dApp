const hre = require("hardhat");
const Providers = require(process.cwd()+"/logs/providers.json");
const Contracts = require(process.cwd()+"/logs/contracts.json");
const fs = require("fs");

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
      fs.writeFileSync(process.cwd()+"/logs/contracts.json", deployment_content)
    } catch (error) {
      console.error(error)
    }
    deployment_content = JSON.stringify(Providers);
    try {
      fs.writeFileSync(process.cwd()+"/logs/providers.json", deployment_content)
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