# Chainlink Jobs

This Chainlink node supports the following jobs and chains:

- Weather Metrics Reporting (dClimate-api-request)
    - Mumbai: 
        - Job ID (externalJobID)              = `b886eeae31f746ac898c5b568a9a5503`
        - Operator Address (contractAddress)  = `0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43`
        - Chain ID (evmChainID)               = `80001`
        - LINK Token Address                  = `0x326C977E6efc84E512bB9C30f76E30c160eD06FB`
    - Rinkeby: 
        - Job ID (externalJobID)              = `0b638cc2bdf84feb8466ddf188ed50b6`
        - Operator Address (contractAddress)  = `0xA3ee2ccC1D79023E2b02d411a0408A0340fea252`
        - Chain ID (evmChainID)               = `4`
        - LINK Token Address                  = `0x01BE23585060835E02B77ef475b0Cc51aA1e0709`
    - Inputs: 
        - `string request_url`: the request URL describing the dClimate data to fetch on IPFS. This request URL follows the same format as the API at `https://api.dclimate.net/` but excluding the root domain (so request URL strings begin with `/apiv3/`). The other exception is that when requesting drought monitoring data this API deviates from the dClimate format by requiring that the `state` and `county` parameters be separated by `_` instead of `-`.
        - `string[] request_ops`: the request operations is a list of strings matching Pandas Series or DataFrame methods to be called on the requested data. 
        - `string[] request_params`: the request parameters is a list of strings representing method configurations for each of the requested operations. Method configs must be strings of lists of Python inputs where the first two elements are Boolean values for whether the output of the associated operation should be returned or not, and whether it should be carried forward to be used as the input for the next operation (or not).
    - Outputs:
        - `uint256 metric`: the final value returned after executing the given Pandas operations on the requested data. All numerical values that are not timestamps are multiplied by `1e18` and cast to integers before being returned on-chain.
        - `string memory unit`: the unit for the returned final value, if applicable. 

Examples can be found in `AdapterTester.sol`.

Explorer pages for Operator contracts:
- [Mumbai](https://mumbai.polygonscan.com/address/0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43)
- [Rinkeby](https://rinkeby.etherscan.io/address/0xa3ee2ccc1d79023e2b02d411a0408a0340fea252)
