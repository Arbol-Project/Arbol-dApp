import RainfallDerivativeProviderAbi from "../../../../smart_contracts/hardhat/artifacts/contracts/RainfallDerivativeFactory.sol/RainfallDerivativeProvider.json";
import RainfallOptionAbi from "../../../../smart_contracts/hardhat/artifacts/contracts/RainfallDerivativeFactory.sol/RainfallOption.json";
import CubanBlizzardDerivativeProviderAbi from "../../../../smart_contracts/hardhat/artifacts/contracts/CubanBlizzardDerivativeFactory.sol/CubanBlizzardDerivativeProvider.json";
import CubanBlizzardOptionAbi from "../../../../smart_contracts/hardhat/artifacts/contracts/CubanBlizzardDerivativeFactory.sol/CubanBlizzardOption.json";


const abis = {
  RainfallDerivativeProvider: RainfallDerivativeProviderAbi.abi,
  RainfallOption: RainfallOptionAbi.abi,
  CubanBlizzardDerivativeProvider: CubanBlizzardDerivativeProviderAbi.abi,
  CubanBlizzardOption: CubanBlizzardOptionAbi.abi,
};

export default abis;
