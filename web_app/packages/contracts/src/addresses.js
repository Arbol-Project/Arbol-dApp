// This address points to a dummy ERC20 contract deployed on Ethereum Mainnet,
// Goerli, Kovan, Rinkeby and Ropsten. Replace it with your smart contracts.
const Contracts = require("./logs/contracts.json");
const Providers = require("./logs/providers.json");

var _addresses = {LinkTokenInterface: "0xa36085F69e2889c224210F603D836748e7dC0088"};
for (const [cname, cdata] of Object.entries(Contracts)) {
  _addresses[cname] = cdata.address;
}
for (const [pname, pdata] of Object.entries(Providers)) {
  _addresses[pname] = pdata.address;
}
const addresses = _addresses;

export default addresses;
