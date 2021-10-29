// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

contract InsuranceContractV3 is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 constant private oraclePaymentAmount = 1 * LINK_DIVISIBILITY;
    uint256 public contractPayout;
    address[] public oracles;
    bytes32[] public jobIds;
    
    // event contractCreated(address _insurer, string _id, uint _start, uint _end, uint _limit);
    // event contractEnded(string _id, uint _time);
    // event contractEvaluationRequested(string _id, bytes32 _req, uint _time);
    // event contractEvaluationFulfilled(string _id, bytes32 _req, uint _time, uint256 _payout);

    /**
     * @dev Creates a new Insurance contract
     */
    constructor() ConfirmedOwner(msg.sender) {
        setPublicChainlinkToken();
        
        oracles.push(0xe9d0d0332934c269132e53c03D3fD63EbA41aae0); // test node
        jobIds.push(stringToBytes32('255b4810914f4237877c6cc1ea6e5f64'));
    }
    
    function requestPayoutEvaluation(string memory _dataset, string memory _opt_type, string[] memory _locations,
                                    uint _start, uint _end, uint _strike, uint _limit, uint _exhaust) 
                                    public onlyOwner {
        Chainlink.Request memory req = buildChainlinkRequest(jobIds[0], address(this), this.fulfillPayoutEvaluation.selector);
        req.add('dataset', _dataset);
        req.add('opt_type', _opt_type);
        req.addStringArray('locations', _locations);
        req.addUint('start', _start);
        req.addUint('end', _end);
        req.addUint('strike', _strike);
        req.addUint('limit', _limit);
        req.addUint('exhaust', _exhaust);
        sendChainlinkRequestTo(oracles[0], req, oraclePaymentAmount);
    }
    
    function fulfillPayoutEvaluation(bytes32 _requestId, uint256 _result) public recordChainlinkFulfillment(_requestId) {
        contractPayout = _result;
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
     * funds are returned to insurance provider, including any remaining LINK tokens
     */
    function endContractInstance() external payable onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
        selfdestruct(payable(msg.sender));
    }
}

// contract InsuranceContractV2 is ChainlinkClient, ConfirmedOwner  {

//     using Chainlink for Chainlink.Request;
//     uint256 private oraclePaymentAmount = LINK_DIVISIBILITY / 10; // 0.1 LINK
//     mapping (address => uint) oracleJobs;
//     bytes32[] public jobIds;
//     address[] public oracles;
//     address public insurer;
    
//     string id;
//     string dataset;
//     string opt_type;
//     string[] locations;
//     uint start;
//     uint end;
//     uint strike;
//     uint limit;
//     uint exhaust;

//     bool contractActive;
//     bool contractEvaluated = false;
//     uint256 contractPayout;
    
//     /**
//      * @dev Prevents a function being run unless the Insurance Contract duration has been reached
//      */
//     modifier onContractEnded() {
//         if (end < block.timestamp) {
//           _;
//         }
//     }

//     /**
//      * @dev Prevents a function being run unless the payout has been evaluated
//      */
//     modifier onContractEvaluated() {
//         require(contractEvaluated,'cannot call until payout has deen evaluated');
//         _;
//     }

    // event contractCreated(address _insurer, string _id, uint _start, uint _end, uint _limit);
    // event contractEnded(string _id, uint _time);
    // event contractEvaluationRequested(string _id, bytes32 _req, uint _time);
    // event contractEvaluationFulfilled(string _id, bytes32 _req, uint _time, uint256 _payout);

//     /**
//      * @dev Creates a new Insurance contract
//      */
//     constructor(string memory _id, string memory _dataset, string memory _opt_type, string[] memory _locations,
//                 uint _start, uint _end, uint _strike, uint _limit, uint _exhaust) 
//                 ConfirmedOwner(msg.sender) {

//         setPublicChainlinkToken();

//         id = _id;
//         dataset = _dataset;
//         opt_type = _opt_type;
//         locations = _locations;
//         start = _start;
//         end = _end;
//         strike = _strike;
//         limit = _limit;
//         exhaust = _exhaust;
//         insurer = msg.sender;
//         contractActive = true;

        // oracles.push(0xe9d0d0332934c269132e53c03D3fD63EbA41aae0); // test node
        // jobIds.push(stringToBytes32('c84bf3f52c0c4dffabd93adfb4de5276'));
//         oracleJobs[oracles[0]] = 0;
        
//         emit contractCreated(insurer, id, start, end, limit);
//     }

//     /**
//       * @dev Makes a request to the oracle hosting the Arbol dApp external adapter and associated job
//       * to determine a contracts payout after the coverage period has ended
//       */
//     function requestContractEvaluation() public onlyOwner onContractEnded() {

//         // mark contract as ended, so no future state changes can occur on the contract
//         if (contractActive) {
//             contractActive = false;
//             emit contractEnded(id, block.timestamp);

//             // build request to external adapter to determine contract payout
//             Chainlink.Request memory req = buildChainlinkRequest(stringToBytes32('c84bf3f52c0c4dffabd93adfb4de5276'), address(this), this.fulfillContractEvaluation.selector);
//             req.add('dataset', dataset);
//             req.add('opt_type', opt_type);
//             req.addStringArray('locations', locations);
//             req.addUint('start', start);
//             req.addUint('end', end);
//             req.addUint('strike', strike);
//             req.addUint('limit', limit);
//             req.addUint('exhaust', exhaust);
//             bytes32 requestId = sendChainlinkRequestTo(0xe9d0d0332934c269132e53c03D3fD63EbA41aae0, req, oraclePaymentAmount);
//             emit contractEvaluationRequested(id, requestId, block.timestamp);
//          }
//      }

//     /**
//      * @dev Callback function - This gets called by the Oracle Contract when the Oracle Node passes data back to the Oracle Contract
//      * The function will take the payout given by the Oracle and post it
//      */
//     function fulfillContractEvaluation(bytes32 _requestId, uint256 _payout) public recordChainlinkFulfillment(_requestId) onContractEnded() {

//         contractEvaluated = true;
//         contractPayout = _payout;
//         emit contractEvaluationFulfilled(id, _requestId, block.timestamp, _payout);

//         // Return any remaining ETH and LINK held by this contract back to the factory contract
//         payable(insurer).transfer(address(this).balance);
//         LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
//         require(link.transfer(insurer, link.balanceOf(address(this))), "Unable to transfer remaining LINK tokens");
//     }

//     /**
//      * @dev add a new node and associated job ID to the contract evaluator set
//      */
//     function addOracleJob(address oracle, bytes32 jobId) external payable onlyOwner {
//         oracles.push(oracle);
//         jobIds.push(jobId);
//     }

//     /**
//      * @dev remove a node and associated job ID from the contract evaluator set
//      */
//     function removeOracleJob(address oracle) external payable onlyOwner {
//         uint index = oracleJobs[oracle];
//         oracles[index] = oracles[oracles.length-1];
//         oracles.pop();
//         jobIds[index] = jobIds[jobIds.length-1];
//         jobIds.pop();
//     }
    
//     /**
//      * @dev Get the eth balance of the contract
//      */
//     function getETHBalance() external view returns (uint) {
//         return address(this).balance;
//     }
    
//     /**
//      * @dev Get the link balance of the contract
//      */
//     function getLINKBalance() external view returns (uint) {
//         LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
//         return link.balanceOf(address(this));
//     }

//     /**
//      * @dev Get the contract ID
//      */
//     function getID() external view returns (string memory) {
//         return id;
//     }

//     /**
//      * @dev Get the crop locations
//      */
//     function getLocations() external view returns (string[] memory) {
//         return locations;
//     }

//     /**
//      * @dev Get the dataset name
//      */
//     function getDataset() external view returns (string memory) {
//         return dataset;
//     }

//     /**
//      * @dev Get the option type
//      */
//     function getOptionType() external view returns (string memory) {
//         return opt_type;
//     }

//     /**
//      * @dev Get the status of the contract
//      */
//     function getContractStatus() external view returns (bool) {
//         return contractActive;
//     }

//     /**
//      * @dev Get whether the contract has been paid out or not
//      */
//     function getContractPayout() external view onContractEvaluated() returns (uint256) {
//         return contractPayout;
//     }

//     /**
//      * @dev Get the contract start date
//      */
//     function getContractStartDate() external view returns (uint) {
//         return start;
//     }

//     /**
//      * @dev Get the contract end date
//      */
//     function getContractEndDate() external view returns (uint) {
//         return end;
//     }

//     /**
//      * @dev Get the contract strike
//      */
//     function getContractStrike() external view returns (uint) {
//         return strike;
//     }

//     /**
//      * @dev Get the contract limit
//      */
//     function getContractLimit() external view returns (uint) {
//         return limit;
//     }

//     /**
//      * @dev Get the contract exhaust
//      */
//     function getContractExhaust() external view returns (uint) {
//         return exhaust;
//     }

//     /**
//      * @dev Get the current date/time according to the blockchain
//      */
//     function getBlockTimeStamp() external view returns (uint) {
//         return block.timestamp;
//     }

//     /**
//      * @dev Get address of the chainlink token
//      */
//     function getChainlinkToken() public view returns (address) {
//         return chainlinkTokenAddress();
//     }

//     function stringToBytes32(string memory source) private pure returns (bytes32 result) {
//         bytes memory tempEmptyStringTest = bytes(source);
//         if (tempEmptyStringTest.length == 0) {
//             return 0x0;
//         }

//         assembly { // solhint-disable-line no-inline-assembly
//             result := mload(add(source, 32))
//         }
//     }
    
//     /**
//      * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
//      * funds are returned to insurance provider, including any remaining LINK tokens
//      */
//     function endContractInstance() external payable onlyOwner {
//         LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
//         require(link.transfer(insurer, link.balanceOf(address(this))), "Unable to transfer");
//         selfdestruct(payable(insurer));
//     }
// }