// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";


contract InsuranceProvider is Ownable {

    uint256 private constant ORACLE_PAYMENT = 0.1 * 10**18; // 0.1 LINK
    address public constant LINK_KOVAN = 0xa36085F69e2889c224210F603D836748e7dC0088; // LINK token address on Kovan
    address public insurer;
    mapping (address => InsuranceContract) contracts;

    constructor() {
        insurer = msg.sender;
    }

    /**
     * @dev Prevents a function being run unless it's called by the Insurance Provider
     */
    // modifier onlyOwner() {
    //     require(insurer == msg.sender, 'Only the Contract Issuer can do this');
    //     _;
    // }

   /**
    * @dev Event to log when a contract is created
    */
    event contractCreated(address _insuranceContract, string _id);

    /**
     * @dev Create a new contract for client, automatically approved and deployed to the blockchain
     */
    function newContract(string memory _id, string memory _dataset, string memory _opt_type, string[] memory _locations, 
                        uint _start, uint _end, uint _strike, uint _limit, uint _exhaust) public payable onlyOwner returns(address) {

        // create contract, send payout amount so contract is fully funded plus a small buffer
        InsuranceContract i = new InsuranceContract(_id,
                                                    _dataset,
                                                    _opt_type,
                                                    _locations,
                                                    _start,
                                                    _end,
                                                    _strike,
                                                    _limit,
                                                    _exhaust,
                                                    ORACLE_PAYMENT,
                                                    LINK_KOVAN
                                                    );
        contracts[address(i)] = i;
        emit contractCreated(address(i), _id);

        // fund the contract with enough LINK tokens to make at least 1 Oracle request, with a buffer
        LinkTokenInterface link = LinkTokenInterface(i.getChainlinkToken());
        link.transfer(address(i), ORACLE_PAYMENT * 2);
        return address(i);
    }

    /**
     * @dev returns the contract for a given address
     */
    function getContract(address _contract) external view returns (InsuranceContract) {
        return contracts[_contract];
    }

    /**
     * @dev Get the insurer address for this insurance provider
     */
    function getInsurer() external view returns (address) {
        return insurer;
    }

    /**
     * @dev Get the status of a given Contract
     */
    function getContractStatus(address payable _contract) external view returns (bool) {
        InsuranceContract i = InsuranceContract(_contract);
        return i.getContractStatus();
    }

    /**
     * @dev Return how much ether is in this master contract
     */
    function getFactoryBalance() external view returns (uint) {
        return address(this).balance;
    }

    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to insurance provider, including any remaining LINK tokens
     */
    function endContractProvider() external payable onlyOwner() {
        LinkTokenInterface link = LinkTokenInterface(LINK_KOVAN);
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
        selfdestruct(payable(insurer));
    }

    /**
     * @dev fallback function, to receive ether
     */
    receive() external payable {  }
    fallback() external payable {  }
}


contract InsuranceContract is ChainlinkClient, Ownable  {
    
    using Chainlink for Chainlink.Request;
    uint256 private oraclePaymentAmount;
    bytes32[] public jobIds;
    address[] public oracles;
    mapping (address => uint) oracleJobs;

    address public insurer;
    string id;
    string dataset;
    string opt_type;
    string[] locations;
    uint start;
    uint end;
    uint strike;
    uint limit;
    uint exhaust;

    bool contractActive;
    bool contractEvaluated = false;
    uint256 contractPayout;

    /**
     * @dev Prevents a function being run unless it's called by Insurance Provider
     */
    // modifier onlyOwner() override {
    //     require(insurer == msg.sender,'Only Insurance provider can do this');
    //     _;
    // }

    /**
     * @dev Prevents a function being run unless the Insurance Contract duration has been reached
     */
    modifier onContractEnded() {
        if (end < block.timestamp) {
          _;
        }
    }

    /**
     * @dev Prevents a function being run unless the payout has been evaluated
     */
    modifier onContractEvaluated() {
        require(contractEvaluated,'cannot call until contract has been evaluated');
        _;
    }

    event contractCreated(address _insurer, string _id, uint _start, uint _end, uint _limit);
    event contractEnded(string _id, uint _time);
    event contractEvaluationInitiated(string _id, bytes32 _req, uint _time);
    event contractEvaluationCompleted(string _id, bytes32 _req, uint _time, uint256 _payout);

    /**
     * @dev Creates a new Insurance contract
     */
    constructor(string memory _id, string memory _dataset, string memory _opt_type, string[] memory _locations,
                uint _start, uint _end, uint _strike, uint _limit, uint _exhaust, uint256 _oraclePaymentAmount,
                address _link) payable Ownable() {

        setChainlinkToken(_link);
        oraclePaymentAmount = _oraclePaymentAmount;

        insurer = msg.sender;
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

        oracles[0] = 0xfc894b51F2D242B27D8e3EA99258120033563678; // dev node, placeholder
        jobIds[0] = 'PLACEHOLDER';
        oracleJobs[oracles[0]] = 0;
        
        /* oracles[1] = 0xfc894b51F2D242B27D8e3EA99258120033563678; // test node, placeholder
        jobIds[2] = 'PLACEHOLDER'; 
        oracleJobs[oracles[1]] = 1; */
        emit contractCreated(insurer, id, start, end, limit);
        }

    /**
      * @dev Makes a request to the oracle hosting the Arbol dApp external adapter and associated job
      * to determine a contracts payout after the coverage period has ended
      */
     function evaluateContract() public onContractEnded() returns (bytes32 requestId)   {

         // mark contract as ended, so no future state changes can occur on the contract
         if (contractActive) {
             contractActive = false;
             emit contractEnded(id, block.timestamp);

             // build request to external adapter to determine contract payout
             Chainlink.Request memory req = buildChainlinkRequest(jobIds[0], address(this), this.evaluateContractCallBack.selector);
             req.add('dataset', dataset);
             req.add('opt_type', opt_type);
             req.addStringArray('locations', locations);
             req.addUint('strike', strike);
             req.addUint('limit', limit);
             req.addUint('exhaust', exhaust);
             requestId = sendChainlinkRequestTo(oracles[0], req, oraclePaymentAmount);
             emit contractEvaluationInitiated(id, requestId, block.timestamp);
         }
     }

    /**
     * @dev Callback function - This gets called by the Oracle Contract when the Oracle Node passes data back to the Oracle Contract
     * The function will take the payout given by the Oracle and post it
     */
    function evaluateContractCallBack(bytes32 _requestId, uint256 _payout) public recordChainlinkFulfillment(_requestId) onContractEnded() {

        contractEvaluated = true;
        contractPayout = _payout;
        emit contractEvaluationCompleted(id, _requestId, block.timestamp, contractPayout);

        // Return any remaining ETH and LINK held by this contract back to the factory contract
        payable(insurer).transfer(address(this).balance);
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(insurer, link.balanceOf(address(this))), "Unable to transfer remaining LINK tokens");
    }

    /**
     * @dev add a new node and associated job ID to the contract evaluator set
     */
    function addOracleJob(address oracle, bytes32 jobId) external payable onlyOwner {
        oracles.push(oracle);
        jobIds.push(jobId);
    }

    /**
     * @dev remove a node and associated job ID from the contract evaluator set
     */
    function removeOracleJob(address oracle) external payable onlyOwner {
        uint index = oracleJobs[oracle];
        oracles[index] = oracles[oracles.length-1];
        oracles.pop();
        jobIds[index] = jobIds[jobIds.length-1];
        jobIds.pop();
    }

    /**
     * @dev Get the balance of the contract
     */
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }

    /**
     * @dev Get the contract ID
     */
    function getID() external view returns (string memory) {
        return id;
    }

    /**
     * @dev Get the crop locations
     */
    function getLocations() external view returns (string[] memory) {
        return locations;
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
     * @dev Get the status of the contract
     */
    function getContractStatus() external view returns (bool) {
        return contractActive;
    }

    /**
     * @dev Get whether the contract has been paid out or not
     */
    function getContractPayout() external view onContractEvaluated() returns (uint256) {
        return contractPayout;
    }

    /**
     * @dev Get the contract start date
     */
    function getContractStartDate() external view returns (uint) {
        return start;
    }

    /**
     * @dev Get the contract end date
     */
    function getContractEndDate() external view returns (uint) {
        return end;
    }

    /**
     * @dev Get the contract strike
     */
    function getContractStrike() external view returns (uint) {
        return strike;
    }

    /**
     * @dev Get the contract limit
     */
    function getContractLimit() external view returns (uint) {
        return limit;
    }

    /**
     * @dev Get the contract exhaust
     */
    function getContractExhaust() external view returns (uint) {
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

    /**
     * @dev Helper function for converting a string to a bytes32 object
     */
    // function stringToBytes32(string memory source) private pure returns (bytes32 result) {
    //     bytes memory tempEmptyStringTest = bytes(source);
    //     if (tempEmptyStringTest.length == 0) {
    //      return 0x0;
    //     }

    //     assembly { // solhint-disable-line no-inline-assembly
    //     result := mload(add(source, 32))
    //     }
    // }

    /**
     * @dev Helper function for converting uint to a string
     */
    // function uintToString(uint _i) internal pure returns (string memory _uintAsString) {
    //     if (_i == 0) {
    //         return "0";
    //     }
    //     uint j = _i;
    //     uint len;
    //     while (j != 0) {
    //         len++;
    //         j /= 10;
    //     }
    //     bytes memory bstr = new bytes(len);
    //     uint k = len - 1;
    //     while (_i != 0) {
    //         bstr[k--] = bytes(uint8(48 + _i % 10));
    //         _i /= 10;
    //     }
    //     return string(bstr);
    // }

    /**
     * @dev Fallback function so contract function can receive ether when required
     */
    receive() external payable {  }
    fallback() external payable {  }
}
