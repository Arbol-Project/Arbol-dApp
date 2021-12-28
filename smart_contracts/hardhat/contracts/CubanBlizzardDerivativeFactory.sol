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
    uint256 private constant ORACLE_PAYMENT = 1 * 10**15;                                                       // 0.001 LINK
    uint256 public constant COLLATERAL_PAYMENT = 250000 * 10**6;                                            // 250,000 * 1 USDC
    uint256 public constant PREMIUM_PAYMENT = 10000 * 10**6;                                                    // 10,000 * 1 USDC
    address public constant COLLATERAL_ADDRESS = 0x3382d07e2736AC80f07D7288750F2442d187a7e3;                    // Arbol USDC wallet
    address public constant PREMIUM_ADDRESS = 0xa679c6154b8d4619Af9F83f0bF9a13A680e01eCf;                       // Buyer's wallet
    address public constant LINK_ADDRESS = 0xa36085F69e2889c224210F603D836748e7dC0088;                          // Link token address on Ethereum Kovan
    address public constant USDC_ADDRESS = 0x8677871C4F153eCc1f9089022f21A937B8483ed9;                          // USDC token address on Ethereum Kovan

    CubanBlizzardOption public blizzardContract;
    bool public collateralDeposited;
    bool public premiumDeposited;
    bool public contractPaidOut;

    /**
     * @dev Event to log when a contract is created
     */
    event contractCreated(address _contract, string _id);
    
    /**
     * @dev Sets deploying address as owner
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
        if (!premiumDeposited && !collateralDeposited) {
            LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);  
            require(usdc.transferFrom(msg.sender, address(this), COLLATERAL_PAYMENT), "unable to deposit collateral");
            collateralDeposited = true;
        }
    }

    /**
     * @notice Deposit premium and purchase new options contract (must first approve smart contract to move USDC!)
     * @dev Collateral must already be deposited, premium must not already be deposited, sender must have access
     */
    function depositPremium()
        external
        checkAccess
    {
        if (!premiumDeposited && collateralDeposited) {
            LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
            require(usdc.transferFrom(msg.sender, address(this), PREMIUM_PAYMENT), "unable to deposit premium");
            premiumDeposited = true;
            newContract();
        }
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
            blizzardContract.addOracleJob(0xc17D82Db74Ce38f0D417cBC78dE0B4E9edAA9a93, "3158889851c94c80bcd267114434bb0a");
            // fund the new contract with enough LINK tokens to make at least 1 Oracle request, with a buffer
            LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
            require(link.transfer(address(blizzardContract), ORACLE_PAYMENT * 10), "unable to fund deployed contract");
            emit contractCreated(address(blizzardContract), "Dallas Mavs 2022-04-10 00:00:00");
        }
    }

    /**
     * @notice Request payout evaluation for the snow protection contract
     * @dev Sender must have access
     */
    function initiateContractEvaluation() 
        external 
        checkAccess 
    {
        blizzardContract.requestPayoutEvaluation();
    }

    /**
     * @notice Fulfill payout evaluation for the snow protection contract
     * @dev Sender must have access
     */
    function fulfillContractEvaluation() 
        external 
        checkAccess 
    {
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
        uint256 payout = blizzardContract.getPayout();
        if (payout > 0) {
            require(usdc.transfer(PREMIUM_ADDRESS, payout), "unable to payout to buyer");
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return remaining balance to provider");

        }
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return balance to provider");
    }

    /**
     * @notice Returns the snow protection contract
     * @return BlizzardContract instance
     */
    function getContract()
        external
        view
        returns (CubanBlizzardOption)
    {
        return blizzardContract;
    }

    /**
     * @notice Returns the address of the contract for a given id
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
     * @notice Returns the payout value for snow protection contract
     * @return uint256 payout value
     */
    function getContractPayout()
        external
        view
        returns (uint256)
    {
        return blizzardContract.getPayout();
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
     * @notice Get the ETH/matic/gas balance of the provider contract
     * @dev Can only be called by the contract owner
     * @return uint256 ETH baalance
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
     * @return uint256 LINK baalance
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
     * @notice Get the USDC/stablecoin balance of the provider contract
     * @return uint256 USDC baalance
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

    /**
     * @notice Development function to end provider contract, in case of bugs or needing to update logic etc
     * @dev Can only be called by the contract owner
     *
     * REMOVE IN PRODUCTION
     */
    function endProviderContract() 
        external 
        onlyOwner 
    {
        LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
        uint256 payout = blizzardContract.getPayout();
        bool evaluated = blizzardContract.getStatus();

        if (evaluated) {
            require(usdc.transfer(PREMIUM_ADDRESS, payout), "unable to transfer payout to buyer");
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return remaining funds to provider");
        } else {
            require(usdc.transfer(PREMIUM_ADDRESS, PREMIUM_PAYMENT), "unable to return premium to buyer");
            require(usdc.transfer(COLLATERAL_ADDRESS, COLLATERAL_PAYMENT), "unable to return collateral to provider");
        }
        blizzardContract.endContractInstance();
        // transfer any remaining tokens held by this account before destroying
        require(usdc.transfer(owner(), usdc.balanceOf(address(this))), "unable to transfer USDC");
        require(link.transfer(owner(), link.balanceOf(address(this))), "unable to transfer LINK");
        selfdestruct(payable(owner()));
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

    string[] public dates;
    uint256 public payout;

    event contractEnded(address _contract, uint256 _time);
    event evaluationRequestSent(address _contract, address _oracle, bytes32 _request, uint256 _time);
    event evaluationRequestFulfilled(address _contract, uint256 _payout, uint256 _time);

    /**
     * @notice Creates a new blizzard option contract
     * @dev Assigns caller address as contract ownert
     */
    constructor() 
        ConfirmedOwner(msg.sender) 
    {
        payout = 0;
        contractEvaluated = false;
        // can't deserialize on node, have to give dates as input
        dates = ["2021-10-06", "2021-10-08", "2021-10-26", "2021-10-28", "2021-10-31", "2021-11-02", "2021-11-06", "2021-11-08", "2021-11-15", "2021-11-27", "2021-11-29", "2021-12-03", "2021-12-04", "2021-12-07", "2021-12-13", "2021-12-15", "2021-12-21", "2021-12-23", "2022-01-03", "2022-01-05", "2022-01-09", "2022-01-15", "2022-01-17", "2022-01-19", "2022-01-20", "2022-01-23", "2022-01-29", "2022-02-02", "2022-02-04", "2022-02-06", "2022-02-08", "2022-02-10", "2022-02-12", "2022-03-03", "2022-03-05", "2022-03-07", "2022-03-09", "2022-03-21", "2022-03-23", "2022-03-27", "2022-03-29", "2022-04-08", "2022-04-10"];
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
     * @notice Add a new node and associated job ID to the contract evaluator set
     * @dev Can only be called by the contract ownder
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
     * @dev Can only be called by the contract ownder
     * @param _job bytes32 ID of oracle job to remove
     */
    function removeOracleJob(
        bytes32 _job
    ) 
        public 
        onlyOwner
    {
        uint256 index = oracleMap[_job];
        oracles[index] = oracles[oracles.length - 1];
        oracles.pop();
        jobs[index] = jobs[jobs.length - 1];
        jobs.pop();
        oracleMap[jobs[index]] = index;
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
        emit contractEnded(address(this), block.timestamp);
        // do all looped reads from memory instead of storage
        uint256 _oraclePayment = oraclePayment;
        address[] memory _oracles = oracles;
        bytes32[] memory _jobs = jobs;
        string[] memory _dates = dates;
        uint256 requests = 0;

        for (uint256 i = 0; i != _oracles.length; i += 1) {
            Chainlink.Request memory req = buildChainlinkRequest(_jobs[i], address(this), this.fulfillPayoutEvaluation.selector);
            req.addStringArray("dates", _dates);
            req.add("station_id", "USW00003927");
            req.add("weather_variable", "SNOW");
            req.add("dataset", "ghcnd");
            req.add("opt_type", "CALL");
            req.addUint("strike", 0);
            req.addUint("limit", 250000);
            req.addUint("tick", 250000);
            req.addUint("threshold", 6);
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
     * @notice Get the contract status
     * @return bool contract evaluation status
     */
    function getStatus() 
        public 
        view 
        returns (bool) 
    {
        return contractEvaluated;
    }

    /**
     * @notice Get the contract payout value, which may not be final
     * @dev Returns the final evaluation or 0 most of the time, and can possibly return an approximate value if currently evaluating on multuiple nodes
     * @return uint256 evaluated payout
     */
    function getPayout() 
        public 
        view 
        returns (uint256) 
    {
        if (contractEvaluated) {
            return payout;
        } else {
            // 0 if contract is active, "close" if contract is currently evaluating, no effect if only one oracle job
            return payout / (oracles.length - requestsPending); 
        }
    }

    /**
     * @notice Development function to end contract, in case of bugs or needing to update logic etc
     * @dev Can only be called by the contract owner
     *
     * REMOVE IN PRODUCTION
     */
    function endContractInstance() 
        public 
        onlyOwner 
    {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(owner(), link.balanceOf(address(this))), "Unable to transfer");
        selfdestruct(payable(owner()));
    }
}
