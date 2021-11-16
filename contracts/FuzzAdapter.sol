// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "contracts/RainfallContractFactory.sol";

contract Fuzzer is DerivativeProvider {

    address echidna_caller = 0x00a329c0648769A73afAc7F9381E08FB43dBEA72;

    constructor() public {
        transferOwnership(0x0000000000000000000000000000000000000000);
    }
    
    function echidna_only_owner() public view returns (bool) {
        return echidna_owner_accesses == 1;
    }
}