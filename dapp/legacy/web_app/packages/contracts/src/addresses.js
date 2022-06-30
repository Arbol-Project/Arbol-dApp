// This address points to a dummy ERC20 contract deployed on Ethereum Mainnet,
// Goerli, Kovan, Rinkeby and Ropsten. Replace it with your smart contracts.
const Contracts = require("./logs/contracts.json");
const Providers = require("./logs/providers.json");

var _addresses = {LINK: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1", USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"};
for (const [cname, cdata] of Object.entries(Contracts)) {
  _addresses[cname] = cdata.address;
}
for (const [pname, pdata] of Object.entries(Providers)) {
  _addresses[pname] = pdata.address;
}
const addresses = _addresses;

export default addresses;
