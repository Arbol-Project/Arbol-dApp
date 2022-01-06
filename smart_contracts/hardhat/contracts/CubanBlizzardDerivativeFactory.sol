// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// need to set LINK_ADDRESS, USDC_ADDRESS, and oracles/jobs depending on network
// also need to set LINK buffer back to 2x

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/SimpleWriteAccessController.sol";


contract CubanBlizzardDerivativeProvider is SimpleWriteAccessController {
    /**
     * @dev BlizzardDerivativeProvider contract for Dallas Snow Protection 21-22 Season
     */
    uint256 private constant ORACLE_PAYMENT = 1 * 10**14;                                                       // 0.0001 LINK
    uint256 public constant COLLATERAL_PAYMENT = 250000 * 10**6;                                                // 250,000 * 1 USDC
    uint256 public constant PREMIUM_PAYMENT = 10000 * 10**6;                                                    // 10,000 * 1 USDC
    address public constant ORACLE_BANK = 0x69640770407A09B166AED26B778699045B304768;                           // address of LINK provider for oracle requests
    address public constant COLLATERAL_ADDRESS = 0xbf417C41F3ab1e01BD6867fB540dA7b734EaeA95;                    // Arbol USDC wallet
    address public constant PREMIUM_ADDRESS = 0xa679c6154b8d4619Af9F83f0bF9a13A680e01eCf;                       // Buyer's wallet
    address public constant LINK_ADDRESS = 0xa36085F69e2889c224210F603D836748e7dC0088;                          // Link token address on Ethereum Kovan
    address public constant USDC_ADDRESS = 0xe8AA8A60C9417d8fD59EB4378687dDCEEd29c1B4;                          // USDC token address on Ethereum Kovan

    CubanBlizzardOption public blizzardContract;
    bool public collateralDeposited;
    bool public premiumDeposited;
    bool public contractPaidOut;

    /**
     * @dev Event to log when a contract is created
     */
    event contractCreated(address _contract, string _id, string[] _params);
    
    /**
     * @dev Sets deploying address as owner, owner must approve this address to move LINK
     */
    constructor() {
        collateralDeposited = false;
        premiumDeposited = false;
        contractPaidOut = false;
    }

    /**
     * @notice Deposit collateral for Dallas snow protection contract (must first approve smart contract to move USDC!)
     * @dev Neither collateral nor premium can already be deposited, sender must have access
     */
    function depositCollateral()
        external
        checkAccess
    {
        require(!premiumDeposited && !collateralDeposited, "unable to deposit premium more than once");
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);  
        require(usdc.transferFrom(msg.sender, address(this), COLLATERAL_PAYMENT), "unable to deposit collateral");
        collateralDeposited = true;
    }

    /**
     * @notice Deposit premium and purchase new options contract (must first approve smart contract to move USDC!)
     * @dev Collateral must already be deposited, premium must not already be deposited, sender must have access
     */
    function depositPremium()
        external
        checkAccess
    {
        require(!premiumDeposited && collateralDeposited, "unable to deposit premium until collateral has been deposited");
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
        require(usdc.transferFrom(msg.sender, address(this), PREMIUM_PAYMENT), "unable to deposit premium");
        premiumDeposited = true;
        newContract();
    }

    /**
     * @dev Private function to create a new options contract once collateral and premium have been deposited
     */
    function newContract() 
        private
    {
        if (premiumDeposited && collateralDeposited) {
            // prevents function from allowing more than one round of collateral/premium/purchases
            collateralDeposited = false;
            blizzardContract = new CubanBlizzardOption();
            blizzardContract.initialize(ORACLE_PAYMENT, LINK_ADDRESS);
            blizzardContract.addOracleJob(0x58935F97aB874Bc4181Bc1A3A85FDE2CA80885cd, bytes32("63bb451d36754aab849577a73ce4eb7e"));
            string[] memory params = blizzardContract.getParameters();
            emit contractCreated(address(blizzardContract), "Dallas Mavs 2022-04-10 00:00:00", params);
        }
    }

    /**
     * @notice Add a new node and associated job ID to the contract execution/evalution set
     * @dev Sender must have access
     * @param _oracle address of oracle contract for chainlink node
     * @param _job string ID for associated oracle job
     */
    function addContractJob(
        address _oracle,
        string memory _job
    ) 
        external 
        checkAccess 
    {
        blizzardContract.addOracleJob(_oracle, stringToBytes32(_job));
    }

    /**
     * @notice Remove a job from the contract execution/evaluation set
     * @dev Sender must have access
     * @param _job string ID for associated oracle job
     */
    function removeContractJob(
        string memory _job
    )
        external
        checkAccess
    {
        blizzardContract.removeOracleJob(stringToBytes32(_job));
    }

    /**
     * @notice Returns the address of the blizzard contract
     * @return address of deployed contract
     */
    function getContractAddress()
        external
        view
        returns (address)
    {
        return address(blizzardContract);
    }

    /**
     * @notice Get the parameters for the blizzard contract
     * @dev Sender must have access
     * @return string[] contract terms
     */
    function getContractParameters() 
        public 
        checkAccess 
        view
        returns (string[] memory) 
    {
        return blizzardContract.getParameters();
    }

    /**
     * @notice Request payout evaluation for the snow protection contract
     * @dev Sender must have access, owner must first approve this address to move LINK
     */
    function initiateContractEvaluation() 
        external 
        checkAccess 
    {
        LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
        uint256 oracle_mult = blizzardContract.getNumJobs();
        require(link.transferFrom(ORACLE_BANK, address(blizzardContract), ORACLE_PAYMENT * oracle_mult), "unable to fund oracle request");
        blizzardContract.requestPayoutEvaluation();
    }

    /**
     * @notice Returns the evaluation status of the snow protection contract
     * @return bool evaluated
     */
    function getContractEvaluated()
        external
        view
        returns (bool)
    {
        return blizzardContract.contractEvaluated();
    }

    /**
     * @notice Returns the payout value for snow protection contract
     * @return uint256 payout value
     */
    function getContractPayout()
        external
        view
        returns (uint256)
    {
        return blizzardContract.payout();
    }

    /**
     * @notice Fulfill payout evaluation for the snow protection contract
     * @dev Sender must have access
     */
    function fulfillContractEvaluation() 
        external 
        checkAccess 
    {
        bool fulfillRequirement = blizzardContract.contractEvaluated();
        require(fulfillRequirement, "unable to fulfill payout until contract is evaluated");
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
        uint256 payout = blizzardContract.payout();
        if (payout > 0) {
            require(usdc.transfer(PREMIUM_ADDRESS, payout), "unable to payout to buyer");
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return remaining balance to provider");

        } else {
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return balance to provider");
        }
        contractPaidOut = true;
    }

    /**
     * @notice Get the USDC/stablecoin balance of the provider contract
     * @return uint256 USDC balance
     */
    function getUSDCBalance() 
        external 
        view 
        returns (uint256) 
    {
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
        return usdc.balanceOf(address(this));
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
}


contract CubanBlizzardOption is ChainlinkClient, ConfirmedOwner {
    /**
     * @dev BlizzardOption contract for Dallas Snow Protection 21-22 Season
     */
    using Chainlink for Chainlink.Request;

    uint256 private oraclePayment;
    mapping(bytes32 => uint256) public oracleMap;
    address[] public oracles;
    bytes32[] public jobs;

    bool public contractEvaluated;
    uint256 private requestsPending;

    string[] private parameters;
    uint256 public payout;

    /**
     * @notice Creates a new blizzard option contract with the terms below
     * @dev Assigns caller address as contract ownert
     */
    constructor() 
        ConfirmedOwner(msg.sender) 
    {
        payout = 0;
        contractEvaluated = false;
        parameters = ["station_id", "USW00003927", 
            "weather_variable", "SNOW", 
            "dataset", "ghcnd", 
            "opt_type", "CALL", 
            "strike", "0", 
            "limit", "250000", 
            "tick", "250000", 
            "threshold", "6", 
            "imperial_units", "True", 
            "dates", '["2021-10-06", "2021-10-08", "2021-10-26", "2021-10-28", "2021-10-31", "2021-11-02", "2021-11-06", "2021-11-08", "2021-11-15", "2021-11-27", "2021-11-29", "2021-12-03", "2021-12-04", "2021-12-07", "2021-12-13", "2021-12-15", "2021-12-21", "2021-12-23", "2022-01-03", "2022-01-05", "2022-01-09", "2022-01-15", "2022-01-17", "2022-01-19", "2022-01-20", "2022-01-23", "2022-01-29", "2022-02-02", "2022-02-04", "2022-02-06", "2022-02-08", "2022-02-10", "2022-02-12", "2022-03-03", "2022-03-05", "2022-03-07", "2022-03-09", "2022-03-21", "2022-03-23", "2022-03-27", "2022-03-29", "2022-04-08", "2022-04-10"]'
            ];
    }

    /**
     * @notice Initializes blizzard contract terms
     * @dev Can only be called by the contract owner
     * @param _oraclePayment uint256 oracle payment amount
     * @param _link address of LINK token on deployed network
     */
    function initialize(
        uint256 _oraclePayment,
        address _link
    ) 
        public 
        onlyOwner 
    {
        oraclePayment = _oraclePayment;
        setChainlinkToken(_link);
    }

    /**
     * @notice Get the contract parameters
     * @dev Can only be called by the contract owner
     * @return string[] contract terms
     */
    function getParameters() 
        public 
        onlyOwner 
        view
        returns (string[] memory) 
    {
        string[] memory _parameters = parameters;
        return _parameters;
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
     * @notice Makes a chainlink oracle request to compute a payout evaluation for this contract
     * @dev Can only be called by the contract owner
     */
    function requestPayoutEvaluation() 
        public 
        onlyOwner 
    {
        require(1649649600 < block.timestamp, "unable to call until coverage period has ended");
        // do all looped reads from memory instead of storage
        uint256 _oraclePayment = oraclePayment;
        address[] memory _oracles = oracles;
        bytes32[] memory _jobs = jobs;
        string[] memory _parameters = parameters;
        uint256 requests = 0;

        for (uint256 i = 0; i != _oracles.length; i += 1) {
            Chainlink.Request memory req = buildChainlinkRequest(_jobs[i], address(this), this.fulfillPayoutEvaluation.selector);
            req.addStringArray("parameters", _parameters);
            sendChainlinkRequestTo(_oracles[i], req, _oraclePayment);
            requests += 1;
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
    }
}