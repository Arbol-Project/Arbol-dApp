import RainfallDerivativeProviderAbi from "./abis/RainfallDerivativeProvider.json";
import RainfallOptionAbi from "./abis//RainfallOption.json";
import CubanBlizzardDerivativeProviderAbi from "./abis/CubanBlizzardDerivativeProvider.json";
import CubanBlizzardOptionAbi from "./abis/CubanBlizzardOption.json";
import erc20Abi from "./abis/erc20.json";


const abis = {
  RainfallDerivativeProvider: RainfallDerivativeProviderAbi.abi,
  RainfallOption: RainfallOptionAbi.abi,
  CubanBlizzardDerivativeProvider: CubanBlizzardDerivativeProviderAbi.abi,
  CubanBlizzardOption: CubanBlizzardOptionAbi.abi,
  erc20: erc20Abi
};

export default abis;
