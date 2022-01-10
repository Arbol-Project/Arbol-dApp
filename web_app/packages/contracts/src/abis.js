import RainfallDerivativeProviderAbi from "./abis/RainfallDerivativeProvider.json";
import RainfallOptionAbi from "./abis//RainfallOption.json";
import BlizzardDerivativeProviderAbi from "./abis/BlizzardDerivativeProvider.json";
import BlizzardOptionAbi from "./abis/BlizzardOption.json";
import erc20Abi from "./abis/erc20.json";


const abis = {
  RainfallDerivativeProvider: RainfallDerivativeProviderAbi.abi,
  RainfallOption: RainfallOptionAbi.abi,
  BlizzardDerivativeProvider: BlizzardDerivativeProviderAbi.abi,
  BlizzardOption: BlizzardOptionAbi.abi,
  erc20: erc20Abi
};

export default abis;
