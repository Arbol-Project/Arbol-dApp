// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// need to set LINK_ADDRESS and oracles/jobs depending on network
// also need to set LINK buffer back to 2x

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

contract RainfallDerivativeProvider is ConfirmedOwner {
    /**
     * @dev RainfallDerivativeProvider contract for general rainfall option contracts
     */
    uint256 private constant ORACLE_PAYMENT = 1 * 10**14;                                                       // 0.0001 LINK
    address public constant ORACLE_BANK = 0x69640770407A09B166AED26B778699045B304768;                           // address of LINK provider for oracle requests
    address public constant LINK_ADDRESS = 0xa36085F69e2889c224210F603D836748e7dC0088;                          // Link token address on Ethereum Kovan

    mapping(string => RainfallOption) public contracts;
    
    /**
     * @dev Event to log when a contract is created
     */
    event contractCreated(address _contract, string _id);

    /**
     * @dev Sets deploying address as owner
     */
    constructor() ConfirmedOwner(msg.sender) {}

    /**
     * @notice Create a new rainfall options contract
     * @dev Can only be called by the contract owner, sender must first approve this address to move LINK
     * @param _parameters string array of all other contract parameters
     * @param _end uint256 unix timestamp of contract end date
     *
     * _parameters = ["id", id, "dataset", dataset, "optType", optType, "locations", locations, "start", start, "end", end, "strike", strike, "limit", limit, "tick", tick]
     * id string ID for the contract to deploy, e.g. "Prasat Bakong PUT, limit: 1.18k"
     * dataset string name of the dataset for the contract, e.g. "chirpsc_final_25-daily"
     * locations string of array lat-lon coordinate pairs e.g. "[[123.456, 789.123], [123.456, 789.123], [123.456, 789.123], ...]"
     * optType string type of option, "CALL" or "PUT"
     * start uint256 unix timestamp of contract start date
     * end uint256 unix timestamp of contract end date
     * strike uint256 contract strike (times 10^20 for solidity)
     * limit uint256 contract limit (times 10^20 for solidity)
     * tick uint256 contract tick (times 10^20 for solidity)
     */
    function newContract(
        string[] memory _parameters,
        uint256 _end
    ) 
        external 
        onlyOwner 
    {
        RainfallOption rainfallContract = new RainfallOption();
        rainfallContract.initialize(ORACLE_PAYMENT, LINK_ADDRESS, _parameters, _end);
        rainfallContract.addOracleJob(0x58935F97aB874Bc4181Bc1A3A85FDE2CA80885cd, stringToBytes32("63bb451d36754aab849577a73ce4eb7e"));
        contracts[_parameters[1]] = rainfallContract;
        emit contractCreated(address(rainfallContract), _parameters[1]);
    }

    /**
     * @notice Request payout evaluation for a specified contract
     * @dev Can only be called by the contract owner
     * @param _id string contract ID
     */
    function initiateContractEvaluation(
        string memory _id
    ) 
        external 
        onlyOwner 
    {
        RainfallOption rainfallContract = contracts[_id];
        LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
        uint256 oracle_mult = rainfallContract.getNumJobs();
        require(link.transferFrom(ORACLE_BANK, address(rainfallContract), ORACLE_PAYMENT * oracle_mult), "Unable to fund deployed contract");
        rainfallContract.requestPayoutEvaluation();
    }

    /**
     * @notice Returns the evaluation status of the contract for a given id
     * @param _id string contract ID
     * @return bool evaluated
     */
    function getContractEvaluated(
        string memory _id
    )
        external
        view
        returns (bool)
    {
        return contracts[_id].contractEvaluated();
    }

    /**
     * @notice Returns the address of the contract for a given id
     * @param _id string contract ID
     * @return address of deployed contract
     */
    function getContractAddress(
        string memory _id
    )
        external
        view
        returns (address)
    {
        return address(contracts[_id]);
    }

    /**
     * @notice Returns the payout value for a specified contract
     * @param _id string contract ID
     * @return uint256 payout value
     */
    function getContractPayout(
        string memory _id
    )
        external
        view
        returns (uint256)
    {
        return contracts[_id].payout();
    }

    /**
     * @notice Add a new node and associated job ID to the contract execution/evalution set
     * @dev Can only be called by the contract owner
     * @param _id string contract ID
     * @param _oracle address of oracle contract for chainlink node
     * @param _job string ID for associated oracle job
     */
    function addContractJob(
        string memory _id,
        address _oracle,
        string memory _job
    ) 
        external 
        onlyOwner 
    {
       contracts[_id].addOracleJob(_oracle, stringToBytes32(_job));
    }

    /**
     * @notice Remove a job from the contract execution/evaluation set
     * @dev Can only be called by the contract owner
     * @param _id string contract ID
     * @param _job string ID for associated oracle job
     */
    function removeContractJob(
        string memory _id, 
        string memory _job
    )
        external
        onlyOwner
    {
        contracts[_id].removeOracleJob(stringToBytes32(_job));
    }

    /**
     * @notice Get the ETH/matic/gas balance of the provider contract
     * @dev Can only be called by the contract owner
     * @return uint256 ETH balance
     */
    function getETHBalance() 
        external 
        view 
        onlyOwner
        returns (uint256) 
    {
        return address(this).balance;
    }

    /**
     * @notice Get the LINK balance of the provider contract
     * @dev Can only be called by the contract owner
     * @return uint256 LINK balance
     */
    function getLINKBalance() 
        external 
        view 
        onlyOwner
        returns (uint256) 
    {
        LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
        return link.balanceOf(address(this));
    }

    /**
     * @dev Write string to bytes32
     * @param _source string to convert
     * @return _result bytes32 converted string
     */
    function stringToBytes32(
        string memory _source
    )
        private
        pure
        returns (bytes32 _result)
    {
        bytes memory tempEmptyStringTest = bytes(_source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-line no-inline-assembly
            _result := mload(add(_source, 32))
        }
    }

    // /**
    //  * @notice Development function to end specified contract, in case of bugs or needing to update logic etc
    //  * @dev Can only be called by the contract owner
    //  * @param _id string contract ID
    //  *
    //  * REMOVE IN PRODUCTION
    //  */
    // function endContractInstance(
    //     string memory _id
    // ) 
    //     external 
    //     onlyOwner 
    // {
    //     contracts[_id].endContractInstance();
    // }

    // /**
    //  * @notice Development function to end provider contract, in case of bugs or needing to update logic etc
    //  * @dev Can only be called by the contract owner
    //  *
    //  * REMOVE IN PRODUCTION
    //  */
    // function endProviderContract() 
    //     external 
    //     onlyOwner 
    // {
    //     LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
    //     require(link.transfer(ORACLE_BANK, link.balanceOf(address(this))), "Unable to transfer");
    //     selfdestruct(payable(owner()));
    // }
}


contract RainfallOption is ChainlinkClient, ConfirmedOwner {
    /**
     * @dev RainfallOption contract for rainfall option contracts
     */
    using Chainlink for Chainlink.Request;

    uint256 private oraclePayment;
    mapping(bytes32 => uint256) public oracleMap;
    address[] public oracles;
    bytes32[] public jobs;

    bool public contractEvaluated;
    uint256 private requestsPending;

    string[] public parameters;
    uint256 private end;
    uint256 public payout;

    event contractEnded(address _contract, uint256 _time);
    event evaluationRequestSent(address _contract, address _oracle, bytes32 _request, uint256 _time);
    event evaluationRequestFulfilled(address _contract, uint256 _payout, uint256 _time);

    /**
     * @notice Creates a new rainfall option contract
     * @dev Assigns caller address as contract ownert
     */
    constructor() 
        ConfirmedOwner(msg.sender) 
    {
        payout = 0;
        contractEvaluated = false;
        requestsPending = 0;
    }

    /**
     * @notice Initializes rainfall contract terms
     * @dev Can only be called by the contract owner
     * @param _oraclePayment uint256 oracle payment amount
     * @param _link address of LINK token on deployed network
     * @param _parameters string array all other contract fields followed by the assigned value: 
     *  e.g. ["id", {id}, "dataset", {dataset}, "optType", {optType}, ...] - required fields for this contract are:
     *              id, dataset, optType, locations, start, end, strike, limit, tick/exhaust, 
     * @param _end uint256 unix timestamp of contract end date
     */
    function initialize(
        uint256 _oraclePayment,
        address _link,
        string[] memory _parameters,
        uint256 _end
    ) 
        public 
        onlyOwner 
    {
        oraclePayment = _oraclePayment;
        setChainlinkToken(_link);
        parameters = _parameters;
        end = _end;
    }

    /**
     * @notice Add a new node and associated job ID to the contract evaluator set
     * @dev Can only be called by the contract owner
     * @param _oracle address of oracle contract for chainlink node
     * @param _job bytes32 ID for associated oracle job
     */
    function addOracleJob(
        address _oracle, 
        bytes32 _job
    )   
        public 
        onlyOwner
    {
        oracles.push(_oracle);
        jobs.push(_job);
        oracleMap[_job] = oracles.length - 1;
    }

    /**
     * @notice Remove a node and associated job ID from the contract evaluator set
     * @dev Can only be called by the contract owner
     * @param _job bytes32 ID of oracle job to remove
     */
    function removeOracleJob(
        bytes32 _job
    ) 
        public 
        onlyOwner
    {
        uint256 index = oracleMap[_job];
        if (!(index == 0 && jobs[index] != _job)) {
            if (index == jobs.length - 1) {
                oracles.pop();
                jobs.pop();
            } else {
                oracles[index] = oracles[oracles.length - 1];
                oracles.pop();
                jobs[index] = jobs[jobs.length - 1];
                jobs.pop();
                oracleMap[jobs[index]] = index;
            }
        }
    }

    /**
     * @notice Makes a chainlink oracle request to compute a payout evaluation for this contract
     * @dev Can only be called by the contract owner
     */
    function requestPayoutEvaluation() 
        public 
        onlyOwner 
    {
        require(end < block.timestamp, "unable to call until coverage period has ended");
        emit contractEnded(address(this), block.timestamp);
        // do all looped reads from memory instead of storage
        uint256 _oraclePayment = oraclePayment;
        address[] memory _oracles = oracles;
        bytes32[] memory _jobs = jobs;
        string[] memory _parameters = parameters;
        uint256 requests = 0;

        for (uint256 i = 0; i != _oracles.length; i += 1) {
            Chainlink.Request memory req = buildChainlinkRequest(_jobs[i], address(this), this.fulfillPayoutEvaluation.selector);
            req.addStringArray("parameters", _parameters);
            bytes32 requestId = sendChainlinkRequestTo(_oracles[i], req, _oraclePayment);
            requests += 1;
            emit evaluationRequestSent(address(this), _oracles[i], requestId, block.timestamp);
            }
        requestsPending = requests;
    }

    /**
     * @dev Callback function for chainlink oracle requests, assigns payout
     */
    function fulfillPayoutEvaluation(bytes32 _requestId, uint256 _result)
        public
        recordChainlinkFulfillment(_requestId)
    {
        payout += _result;
        requestsPending -= 1;
        if (requestsPending == 0) {
            payout /= oracles.length;
            contractEvaluated = true;

            LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
            require(link.transfer(owner(), link.balanceOf(address(this))), "Unable to transfer remaining LINK tokens");
        }
        emit evaluationRequestFulfilled(address(this), _result, block.timestamp);
    }

    /**
     * @notice Get the number of contract jobs
     * @return uint256 number of jobs
     */
    function getNumJobs() 
        public 
        view 
        returns (uint256) 
    {
        return jobs.length;
    }

    /**
     * @notice Get the LINK balance of the contract
     * @dev Can only be called by the contract owner
     * @return uint256 LINK balance
     */
    function getLINKBalance() 
        external 
        view 
        returns (uint256) 
    {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        return link.balanceOf(address(this));
    }

    // /**
    //  * @notice Development function to end contract, in case of bugs or needing to update logic etc
    //  * @dev Can only be called by the contract owner
    //  *
    //  * REMOVE IN PRODUCTION
    //  */
    // function endContractInstance() 
    //     public 
    //     onlyOwner 
    // {
    //     LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
    //     require(link.transfer(owner(), link.balanceOf(address(this))), "Unable to transfer");
    //     selfdestruct(payable(owner()));
    // }
}
