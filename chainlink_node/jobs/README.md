# Chainlink Jobs

This Chainlink node supports the following jobs and chains:

- [Weather Metrics Reporting](https://github.com/Arbol-Project/Arbol-dApp/blob/master/chainlink_node/adapter/api.py) (dClimate-api-request)
    - This Chainlink job allows a user to make a request for dClimate weather data on IPFS and operate on it as a Pandas object to compute and return a desired numerical metric.
    - Configs
        - Mumbai: 
            - Job ID (externalJobID)              = `b886eeae-31f7-46ac-898c-5b568a9a5503`
            - Operator Address (contractAddress)  = `0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43`
            - Chain ID (evmChainID)               = `80001`
            - LINK Token Address                  = `0x326C977E6efc84E512bB9C30f76E30c160eD06FB`
        - Rinkeby: 
            - Job ID (externalJobID)              = `0b638cc2-bdf8-4feb-8466-ddf188ed50b6`
            - Operator Address (contractAddress)  = `0xA3ee2ccC1D79023E2b02d411a0408A0340fea252`
            - Chain ID (evmChainID)               = `4`
            - LINK Token Address                  = `0x01BE23585060835E02B77ef475b0Cc51aA1e0709`
    - Inputs: 
        - `string request_url`: the request URL describing the dClimate data to fetch on IPFS. This request URL follows the same format as the API at `https://api.dclimate.net/` but excluding the root domain (so request URL strings begin with `/apiv3/`). Additionally when requesting drought monitoring data this API deviates from the dClimate format by requiring that the `state` and `county` parameters be separated by `_` instead of `-`. Lastly, this adapter does not support requests for CEDA Biomass data or valid state/county/commodity lookups.
        - `string[] request_ops`: the request operations is a list of strings matching Pandas Series or DataFrame methods to be called on the requested data. 
        - `string[] request_params`: the request parameters is a list of strings representing method configurations for each of the requested operations. Method configs must be strings of lists of Python inputs where the first two elements are Boolean values for whether the output of the associated operation should be returned or not, and whether it should be carried forward to be used as the input for the next operation (or not). Note: at this time only one computed value can be returned per request, so if multiple method configurations specify to return the result, then the first such result is returned only.
    - Outputs:
        - `uint256 metric`: the final value returned after executing the given Pandas operations on the requested data. All numerical values that are not timestamps are multiplied by `1e18` and cast to integers before being returned on-chain.
        - `string memory unit`: the unit for the returned final value, if applicable. If the request fails, the adapter attempts to return an error message in the unit slot.
- [Contract Payout Evaluation V2](https://github.com/Arbol-Project/Arbol-dApp/blob/master/chainlink_node/adapter/adapter.py) (arbol-payout-evaluation)
    - This Chainlink job allows a user to make a request for a payout evaluation for an Arbol parametric weather derivative contract.
    - Configs
        - Polygon: 
            - Job ID (externalJobID)              = `940708c3-e44c-40f1-bd03-d34c1b3edcf6`
            - Operator Address (contractAddress)  = `0x76dfA9a36db355F101B241b66e2fA97f7Ca09C24`
            - Chain ID (evmChainID)               = `137`
            - LINK Token Address                  = `0xb0897686c545045aFc77CF20eC7A532E3120E0F1`
        - Mumbai: 
            - Job ID (externalJobID)              = `a462d643-c963-4d64-8bfa-605436c2cb08`
            - Operator Address (contractAddress)  = `0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43`
            - Chain ID (evmChainID)               = `80001`
            - LINK Token Address                  = `0x326C977E6efc84E512bB9C30f76E30c160eD06FB`
        - Rinkeby: 
            - Job ID (externalJobID)              = `2c227ca3-4bea-46a3-823b-b661046e1d4d`
            - Operator Address (contractAddress)  = `0xA3ee2ccC1D79023E2b02d411a0408A0340fea252`
            - Chain ID (evmChainID)               = `4`
            - LINK Token Address                  = `0x01BE23585060835E02B77ef475b0Cc51aA1e0709`
    - Inputs: 
        - `string uri`: the token URI of the NFT associated with the contract to be evaluated. The `uri` is the concatenation of the hashed contract SRO and the contract ID in Arbol's database. At evaluation, the contract terms are fetched from the DB and their hash is verified against the hash in the URI to guarantee that the contract terms have not changed since sale.
    - Outputs:
        - `uint256 payout`: the computed payout computed using dClimate weather data on IPFS and Arbol pricing and evaluation logic.
- [Contract Payout Evaluation V1](https://github.com/Arbol-Project/Arbol-dApp/blob/master/chainlink_node/adapter/adapterV1.py) (arbol-contract-evaluation)
    - This Chainlink job allows a user to make a V1 request for a payout evaluation for an Arbol parametric weather derivative contract.
    - Configs
        - Polygon: 
            - Job ID (externalJobID)              = `ccaf1bfe-97d8-469c-aff3-95a0aaa61e27`
            - Operator Address (contractAddress)  = `0x76dfA9a36db355F101B241b66e2fA97f7Ca09C24`
            - Chain ID (evmChainID)               = `137`
            - LINK Token Address                  = `0xb0897686c545045aFc77CF20eC7A532E3120E0F1`
        - Mumbai: 
            - Job ID (externalJobID)              = `a462d643-c963-4d64-8bfa-605436c2cb08`
            - Operator Address (contractAddress)  = `0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43`
            - Chain ID (evmChainID)               = `80001`
            - LINK Token Address                  = `0x326C977E6efc84E512bB9C30f76E30c160eD06FB`
    - Inputs: 
        - `string[] parameters`: the contract terms as a list of strings, where each parameter value is preceeded by the string name of the parameter (can be thought of as an unrolled dictionary).
    - Outputs:
        - `uint256 payout`: the computed payout computed using dClimate weather data on IPFS and open source evaluation logic

Examples can be found in `AdapterTester.sol`.

Explorer pages for Operator contracts:
- [Polygon](https://polygonscan.com/address/0x76dfA9a36db355F101B241b66e2fA97f7Ca09C24)
- [Mumbai](https://mumbai.polygonscan.com/address/0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43)
- [Rinkeby](https://rinkeby.etherscan.io/address/0xa3ee2ccc1d79023e2b02d411a0408a0340fea252)
