// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/SimpleWriteAccessController.sol";


contract BlizzardDerivativeProvider is SimpleWriteAccessController {
    /**
     * @notice BlizzardDerivativeProvider contract for Dallas Snow Protection 21-22 Season
     * @dev Only enables a single purchase/creation of the contract instance
     */
    uint256 private constant ORACLE_PAYMENT = 1 * 10**14;                                                       // 0.0001 LINK
    uint256 private constant COLLATERAL_PAYMENT = 25 * 10**5 * 10**6;                                           // 250,000 * 1 USDC
    uint256 private constant PREMIUM_PAYMENT = 10**5 * 10**6;                                                   // 10,000 * 1 USDC
    address private constant COLLATERAL_ADDRESS = 0x3382d07e2736AC80f07D7288750F2442d187a7e3;                   // Arbol USDC wallet
    address private constant PREMIUM_ADDRESS = 0xa679c6154b8d4619Af9F83f0bF9a13A680e01eCf;                      // Buyer's wallet
    address public constant LINK_ADDRESS = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB;                          // Link token address on Matic Mumbai
    address public constant USDC_ADDRESS = 0x8677871C4F153eCc1f9089022f21A937B8483ed9;                          // USDC token address on Matic Mumbai (ERC677 is backwards compatible to ERC20)

    BlizzardOption private blizzardContract;
    bool private collateralDeposited;
    bool private premiumDeposited;
    bool public contractPaidOut;

    /**
     * @dev Event to log when a contract is created
     */
    event contractCreated(address _contract, string _id);
    
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
            // require(!premiumDeposited, "collateral cannot be deposited after premium");
            // require(!collateralDeposited, "collateral has already been deposited for next purchase");
            require(usdc.allowance(msg.sender, address(this)) >= COLLATERAL_PAYMENT, "sender has not approved contract to deposit collateral");
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
            // require(collateralDeposited, "unable to call until collateral has been deposited");
            // require(!premiumDeposited, "premium has already been deposited for this purchase");
            require(usdc.allowance(msg.sender, address(this)) >= PREMIUM_PAYMENT, "sender has not approved contract to deposit premium");
            require(usdc.transferFrom(msg.sender, address(this), PREMIUM_PAYMENT), "unable to deposit premium");
            premiumDeposited = true;
            buyContract();
        }
    }

    /**
     * @dev Private function to create a new options contract once collateral and premium have been deposited
     */
    function buyContract() 
        private
    {
        if (premiumDeposited && collateralDeposited) {
            LinkTokenInterface link = LinkTokenInterface(LINK_ADDRESS);
            collateralDeposited = false;                // setting to false prevents another round of collateral/premium/purchase from happening

            blizzardContract = new BlizzardOption();
            blizzardContract.initialize(ORACLE_PAYMENT, LINK_ADDRESS);
            blizzardContract.addOracleJob(0x7bcfF26a5A05AF38f926715d433c576f9F82f5DC, "6de976e92c294704b7b2e48358f43396");
            // fund the new contract with enough LINK tokens to make at least 1 Oracle request, with a buffer
            require(link.transfer(address(blizzardContract), ORACLE_PAYMENT * 2), "unable to fund deployed contract");
            emit contractCreated(address(blizzardContract), "Mavs_Blizzard_21-22");
        }
    }

    /**
     * @notice Returns the snow protection contract
     */
    function getContract()
        external
        view
        returns (BlizzardOption)
    {
        return blizzardContract;
    }

    /**
     * @notice Add a new node and associated job ID to the contract execution/evalution set
     * @dev Sender must have access
     */
    function addContractJob(
        address _oracle,
        string memory _jobId
    ) 
        external 
        checkAccess 
    {
        blizzardContract.addOracleJob(_oracle, stringToBytes32(_jobId));
    }

    /**
     * @notice Remove a job from the contract execution/evaluation set
     * @dev Sender must have access
     */
    function removeContractJob(
        string memory _jobId
    )
        external
        checkAccess
    {
        blizzardContract.removeOracleJob(stringToBytes32(_jobId));
    }

    /**
     * @notice Request payout evaluation for the snow protection contract
     * @dev Sender must have access
     */
    function initiatePayoutEvaluation() 
        external 
        checkAccess 
    {
        LinkTokenInterface usdc = LinkTokenInterface(USDC_ADDRESS);
        blizzardContract.requestPayoutEvaluation();

        uint256 payout = blizzardContract.getPayout();
        if (payout > 0) {
            require(usdc.transfer(PREMIUM_ADDRESS, payout), "unable to payout to buyer");
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return remaining balance to provider");

        }
            require(usdc.transfer(COLLATERAL_ADDRESS, usdc.balanceOf(address(this))), "unable to return balance to provider");
    }

    /**
     * @notice Request payout value for snow protection contract
     */
    function getContractPayout()
        external
        view
        returns (uint256)
    {
        return blizzardContract.getPayout();
    }

    /**
     * @notice Get the ETH/matic/gas balance of the provider contract
     * @dev Can only be called by the contract owner
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


contract BlizzardOption is ChainlinkClient, ConfirmedOwner {
    /**
     * @notice BlizzardOption contract for Dallas Snow Protection 21-22 Season
     * @dev Hard coded with contract terms (see requestPayoutEvaluation)
     */
    using Chainlink for Chainlink.Request;

    uint256 private oraclePayment;
    mapping(bytes32 => uint256) public oracleMap;
    address[] public oracles;
    bytes32[] public jobIds;

    bool public contractActive;
    bool public contractEvaluated;
    uint256 private requestsPending;

    string[] public dates;
    uint256 public payout;

    /**
     * @dev Prevents a function being run unless the end date has been passed
     */
    modifier onContractEnded() {
        require(1649649600 < block.timestamp, "unable to call until coverage period has ended"); // 1649649600: unix timestamp of beginning of day after final home game of the season
        _;
    }

    event contractEnded(address _contract, uint256 _time);
    event evaluationRequestSent(address _contract, address _oracle, bytes32 _request, uint256 _time);
    event evaluationRequestFulfilled(address _contract, uint256 _payout, uint256 _time);

    /**
     * @dev Creates a new blizzard options contract
     */
    constructor() 
        ConfirmedOwner(msg.sender) 
    {
        payout = 0;
        contractActive = true;
        contractEvaluated = false;
        // can't deserialize on node, have to give dates as input
        dates = ["2021-10-06", "2021-10-08", "2021-10-26", "2021-10-28", "2021-10-31", "2021-11-02", "2021-11-06", "2021-11-08", "2021-11-15", "2021-11-27", "2021-11-29", "2021-12-03", "2021-12-04", "2021-12-07", "2021-12-13", "2021-12-15", "2021-12-21", "2021-12-23", "2022-01-03", "2022-01-05", "2022-01-09", "2022-01-15", "2022-01-17", "2022-01-19", "2022-01-20", "2022-01-23", "2022-01-29", "2022-02-02", "2022-02-04", "2022-02-06", "2022-02-08", "2022-02-10", "2022-02-12", "2022-03-03", "2022-03-05", "2022-03-07", "2022-03-09", "2022-03-21", "2022-03-23", "2022-03-27", "2022-03-29", "2022-04-08", "2022-04-10"];
    }

    /**
     * @dev Initializes a new blizzard options contract
     */
    function initialize(
        uint256 _oracle_payment,
        address _link
    ) 
        public
        onlyOwner
    {
        oraclePayment = _oracle_payment;
        setChainlinkToken(_link);
    }

    /**
     * @dev Get the payout value, may not be final
     */
    function getStatus() 
        public 
        view 
        returns (bool) 
    {
        return contractEvaluated;
    }

    /**
     * @dev Get the payout value, may not be final
     */
    function getPayout() 
        public 
        view 
        returns (uint256) 
    {
        if (contractEvaluated) {
            return payout;
        } else {
            return payout / (oracles.length - requestsPending); // 0 if contract is active, "close" if contract is currently evaluating, no effect if only one oracle job
        }
    }

    /**
     * @dev Add a new node and associated job ID to the contract evaluator set
     */
    function addOracleJob(
        address _oracle, 
        bytes32 _jobId
    )   
        public 
        onlyOwner
    {
        oracles.push(_oracle);
        jobIds.push(_jobId);
        oracleMap[_jobId] = oracles.length - 1;
    }

    /**
     * @dev Remove a node and associated job ID from the contract evaluator set
     */
    function removeOracleJob(
        bytes32 _jobId
    ) 
        public 
        onlyOwner
    {
        uint256 index = oracleMap[_jobId];
        oracles[index] = oracles[oracles.length - 1];
        oracles.pop();
        jobIds[index] = jobIds[jobIds.length - 1];
        jobIds.pop();
        oracleMap[jobIds[index]] = index;
    }

    /**
     * @dev Makes a request to the oracles hosting the Arbol dApp external adapter and associated job
     * to determine a contracts payout after the coverage period has ended
     */
    function requestPayoutEvaluation() 
        public 
        onlyOwner 
        onContractEnded 
    {
        if (contractActive) {
            contractActive = false;
            emit contractEnded(address(this), block.timestamp);

            for (uint256 i = 0; i != oracles.length; i += 1) {
                Chainlink.Request memory req = buildChainlinkRequest(jobIds[i], address(this), this.fulfillPayoutEvaluation.selector);
                req.addStringArray("dates", dates);
                req.add("station_id", "USW00003927");
                req.add("weather_variable", "SNOW");
                req.add("dataset", "ghcnd");
                req.add("opt_type", "CALL");
                req.addUint("strike", 0);
                req.addUint("limit", 250000);
                req.addUint("tick", 250000);
                req.addUint("threshold", 6);
                bytes32 requestId = sendChainlinkRequestTo(oracles[i], req, oraclePayment);
                requestsPending += 1;
                emit evaluationRequestSent(address(this), oracles[i], requestId, block.timestamp);
            }
        }
    }

    function fulfillPayoutEvaluation(bytes32 _requestId, uint256 _result)
        public
        recordChainlinkFulfillment(_requestId)
    {
        payout += _result;
        requestsPending -= 1;
        // need to be careful here, if request fails and does not callback then requestsPending would sit at n > 0 and final payout would not be computed
        if (requestsPending == 0) {
            payout /= oracles.length;
            contractEvaluated = true;

            LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
            require(link.transfer(owner(), link.balanceOf(address(this))), "Unable to transfer remaining LINK tokens");
        }
        emit evaluationRequestFulfilled(address(this), _result, block.timestamp);
    }

    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
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
