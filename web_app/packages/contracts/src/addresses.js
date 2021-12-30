// This address points to a dummy ERC20 contract deployed on Ethereum Mainnet,
// Goerli, Kovan, Rinkeby and Ropsten. Replace it with your smart contracts.
const Contracts = require("../../../../smart_contracts/hardhat/logs/contracts.json");
const Providers = require("../../../../smart_contracts/hardhat/logs/providers.json");

var _addresses = {};
for (const [cname, cdata] of Object.entries(Contracts)) {
  _addresses[cname] = cdata.address;
}
for (const [pname, pdata] of Object.entries(Providers)) {
  _addresses[pname] = pdata.address;
}
const addresses = _addresses;

export default addresses;
