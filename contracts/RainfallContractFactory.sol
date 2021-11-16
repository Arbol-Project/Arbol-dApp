// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";


contract DerivativeProvider is ChainlinkClient, ConfirmedOwner {

    uint256 private constant ORACLE_PAYMENT = 1 * LINK_DIVISIBILITY;
    address public provider;
    mapping (address => ClimateOption) contracts;
    uint public echidna_owner_accesses = 0;

    constructor() ConfirmedOwner(msg.sender) {

        echidna_owner_accesses += 1;
        setPublicChainlinkToken();
        provider = msg.sender;
    }

   /**
    * @dev Event to log when a contract is created
    */
    event contractCreated(address _contract, string _id);

    /**
     * @dev Create a new contract for client, automatically approved and deployed to the blockchain
     */
    function newContract(string memory _id, string memory _dataset, string memory _opt_type, string[] memory _locations,
                        uint _start, uint _end, uint _strike, uint _limit, uint _exhaust) 
                        public onlyOwner {

        echidna_owner_accesses += 1;

        ClimateOption i = new ClimateOption(_id,
                                            _dataset,
                                            _opt_type,
                                            _locations,
                                            _start,
                                            _end,
                                            _strike,
                                            _limit,
                                            _exhaust,
                                            ORACLE_PAYMENT,
                                            provider);
        contracts[address(i)] = i;
        emit contractCreated(address(i), _id);

        // manually fund the new contract with enough LINK tokens to make at least 1 Oracle request, with a buffer
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(link.transfer(address(i), ORACLE_PAYMENT * 2), "Unable to fund deployed contract");
    }

    /**
     * @dev Returns the contract for a given address
     */
    function getContract(address _contract) external view returns (ClimateOption) {
        return contracts[_contract];
    }
    
    /**
     * @dev Request evaluation of a given contract
     */
    function getContractPayout(address _contract) external view returns (uint256) {
        return contracts[_contract].getPayout();
    }

    /**
     * @dev Get the eth balance of the provider contract
     */
    function getETHBalance() external view returns (uint) {
        return address(this).balance;
    }
    
    /**
     * @dev Get the link balance of the provider contract
     */
    function getLINKBalance() external view returns (uint) {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        return link.balanceOf(address(this));
    }

    /**
     * @dev Get the current date/time according to the blockchain
     */
    function getBlockTimeStamp() external view returns (uint) {
        return block.timestamp;
    }

    /**
     * @dev Get address of the chainlink token
     */
    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly { // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }
    
    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
     */
    function endContractInstance() external onlyOwner {
        echidna_owner_accesses += 1;
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(link.transfer(provider, link.balanceOf(address(this))), "Unable to transfer");
        selfdestruct(payable(provider));
    }
}


contract ClimateOption is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private oraclePaymentAmount;
    mapping (address => uint) public oracleMap;
    // set oracles here before deploying
    address[] public oracles = [0xe9d0d0332934c269132e53c03D3fD63EbA41aae0];
    bytes32[] public jobIds = [stringToBytes32('255b4810914f4237877c6cc1ea6e5f64')];
    address public provider;
    bool public contractActive;
    bool public contractEvaluated;
    uint private requestsPending;
    
    string private id;
    string private dataset;
    string private opt_type;
    string[] private locations;
    uint private start;
    uint private end;
    uint private strike;
    uint private limit;
    uint private exhaust;
    uint256 private payout;
    uint256 private agg_result;
    
    /**
     * @dev Prevents a function being run unless the end date has been passed
     */
    modifier onContractEnded() {
        require(end < block.timestamp, 'cannot call until coverage period has ended');
          _;
    }
    
    /**
     * @dev Prevents a function being run unless the contract has been evaluated
     */
    modifier onContractEvaluated() {
        require(contractEvaluated, 'cannot call until coverade period has ended');
          _;
    }
    
    event contractCreated(address _contract, uint _start, uint _end, uint _limit);
    event contractEnded(address _contract, uint _end, uint _time);
    event contractEvaluationRequested(address _contract, bytes32 _req, address _oracle, uint _time);
    event contractEvaluationFulfilled(address _contract, uint _time, uint256 _payout);

    /**
     * @dev Creates a new climate options contract
     */
    constructor(string memory _id, string memory _dataset, string memory _opt_type, string[] memory _locations,
                uint _start, uint _end, uint _strike, uint _limit, uint _exhaust, uint _oraclePaymentAmount,
                address _provider) 
                ConfirmedOwner(_provider) {
                    
        setPublicChainlinkToken();
        
        for (uint i = 0; i != oracles.length; i += 1) {
            oracleMap[oracles[i]] = i;
        }
        
        oraclePaymentAmount = _oraclePaymentAmount;
        provider = _provider;
        id = _id;
        dataset = _dataset;
        opt_type = _opt_type;
        locations = _locations;
        start = _start;
        end = _end;
        strike = _strike;
        limit = _limit;
        exhaust = _exhaust;
        contractActive = true;
        contractEvaluated = false;
        requestsPending = 0;
        emit contractCreated(address(this), _start, _end, _limit);
    }
    
    /**
      * @dev Makes a request to the oracle hosting the Arbol dApp external adapter and associated job
      * to determine a contracts payout after the coverage period has ended
      */
    function requestPayoutEvaluation() public onlyOwner onContractEnded {
        if (contractActive) {
            contractActive = false;
            emit contractEnded(address(this), end, block.timestamp);

            for (uint i = 0; i != oracles.length; i += 1) {
                Chainlink.Request memory req = buildChainlinkRequest(jobIds[i], address(this), this.fulfillPayoutEvaluation.selector);
                req.add('dataset', dataset);
                req.add('opt_type', opt_type);
                req.addStringArray('locations', locations);
                req.addUint('start', start);
                req.addUint('end', end);
                req.addUint('strike', strike);
                req.addUint('limit', limit);
                req.addUint('exhaust', exhaust);
                bytes32 requestId = sendChainlinkRequestTo(oracles[i], req, oraclePaymentAmount);
                requestsPending += 1;
                emit contractEvaluationRequested(address(this), requestId, oracles[i], block.timestamp);   
            }
        }
    }
    
    function fulfillPayoutEvaluation(bytes32 _requestId, uint256 _result) public recordChainlinkFulfillment(_requestId) {
        // payout = _result;
        agg_result += _result;
        requestsPending -= 1;
        if (requestsPending == 0) {
            payout = agg_result / oracles.length;
            contractEvaluated = true;
            emit contractEvaluationFulfilled(address(this), block.timestamp, payout);
            
            LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
            require(link.transfer(provider, link.balanceOf(address(this))), "Unable to transfer remaining LINK tokens");
        }
    }
    
    /**
     * @dev Get the payout value
     */
    function getPayout() external view onContractEvaluated returns (uint) {
        return payout;
    }

    /**
     * @dev Get the eth balance of the contract
     */
    function getETHBalance() external view returns (uint) {
        return address(this).balance;
    }
    
    /**
     * @dev Get the link balance of the contract
     */
    function getLINKBalance() external view returns (uint) {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        return link.balanceOf(address(this));
    }
    
    /**
     * @dev add a new node and associated job ID to the contract evaluator set
     */
    function addOracleJob(address oracle, bytes32 jobId) external onlyOwner {
        oracles.push(oracle);
        jobIds.push(jobId);
    }

    /**
     * @dev remove a node and associated job ID from the contract evaluator set
     */
    function removeOracleJob(address oracle) external onlyOwner {
        uint index = oracleMap[oracle];
        oracles[index] = oracles[oracles.length-1];
        oracles.pop();
        jobIds[index] = jobIds[jobIds.length-1];
        jobIds.pop();
    }
    
    /**
     * @dev Get the contract ID
     */
    function getID() external view returns (string memory) {
        return id;
    }
    
    /**
     * @dev Get the dataset name
     */
    function getDataset() external view returns (string memory) {
        return dataset;
    }

    /**
     * @dev Get the option type
     */
    function getOptionType() external view returns (string memory) {
        return opt_type;
    }
    
    /**
     * @dev Get the crop locations
     */
    function getLocations() external view returns (string[] memory) {
        return locations;
    }


    /**
     * @dev Get the contract start date
     */
    function getStartDate() external view returns (uint) {
        return start;
    }

    /**
     * @dev Get the contract end date
     */
    function getEndDate() external view returns (uint) {
        return end;
    }

    /**
     * @dev Get the contract strike
     */
    function getStrike() external view returns (uint) {
        return strike;
    }

    /**
     * @dev Get the contract limit
     */
    function getLimit() external view returns (uint) {
        return limit;
    }

    /**
     * @dev Get the contract exhaust
     */
    function getExhaust() external view returns (uint) {
        return exhaust;
    }

    /**
     * @dev Get the current date/time according to the blockchain
     */
    function getBlockTimeStamp() external view returns (uint) {
        return block.timestamp;
    }

    /**
     * @dev Get address of the chainlink token
     */
    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly { // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }
    
    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
     */
    function endContractInstance() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(link.transfer(provider, link.balanceOf(address(this))), "Unable to transfer");
        selfdestruct(payable(provider));
    }
}