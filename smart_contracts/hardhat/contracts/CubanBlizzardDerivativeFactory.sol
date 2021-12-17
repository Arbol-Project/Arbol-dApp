// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/SimpleWriteAccessController.sol";


contract DerivativeProvider is SimpleWriteAccessController {
    /**
     * @dev DerivativeProvider contract for Dallas Snow Protection 21-22 Season
     */
    uint256 private constant ORACLE_PAYMENT = 1 * 10**14;                               // 0.0001 LINK
    uint256 private constant COLLATERAL = 25 * 10**5 * 10**6;                           // 250,000 * 1 USDC
    uint256 private constant PREMIUM = 10**5 * 10**6;                                   // 10,000 * 1 USDC
    address public constant LINK_ADDRESS = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB;  // Link token address on Matic Mumbai
    address public constant USDC_ADDRESS = 0x8677871C4F153eCc1f9089022f21A937B8483ed9;  // USDC token address on Matic Mumbai
    
    LinkTokenInterface public link;
    LinkTokenInterface public usdc;

    BlizzardOption[] private contracts;
    bool[] private collateralDeposits;
    address private collateralProvider;

    constructor() {
        link = LinkTokenInterface(LINK_ADDRESS);
        usdc = LinkTokenInterface(USDC_ADDRESS); // erc677 is backwards compatible to erc20
        collateralDeposits.push(false);
    }

    /**
     * @dev Event to log when a contract is created
     */
    event contractCreated(address _contract, string _id);

    /**
     * @dev Prevents a contract from being created unless the collateral has been deposited
     */
    modifier onCollateralDeposited() {
        require(collateralDeposits[collateralDeposits.length - 1], "unable to call until collateral has been deposited");
        _;
    }

    /**
     * @dev Deposit collateral for Dallas snow protection contract
     */
    function depositCollateral()
        external
        checkAccess
    {
        require(!collateralDeposits[collateralDeposits.length - 1], "collateral has already been deposited for next purchase");
        require(usdc.balanceOf(msg.sender) >= COLLATERAL, "sender does not have enough collateral");
        require(usdc.allowance(msg.sender, address(this)) >= COLLATERAL, "sender has not approved contract to deposit collateral");
        require(usdc.transferFrom(msg.sender, address(this), COLLATERAL), "unable to deposit collateral");

        collateralDeposits[collateralDeposits.length - 1] = true;
        collateralProvider = msg.sender;
    }

    /**
     * @dev Deposit premium and buy new options contract
     */
    function buyContract()
        external
        checkAccess
    {
        require(usdc.balanceOf(msg.sender) >= PREMIUM, "buyer cannot cover premium");
        require(usdc.allowance(msg.sender, address(this)) >= PREMIUM, "buyer has not approved contract to deposit premium");
        require(usdc.transferFrom(msg.sender, address(this), PREMIUM), "unable to deposit premium");

        BlizzardOption option = new BlizzardOption();
        option.initialize(ORACLE_PAYMENT, COLLATERAL, PREMIUM, LINK_ADDRESS, collateralProvider, msg.sender);
        option.addOracleJob(0x7bcfF26a5A05AF38f926715d433c576f9F82f5DC, "6de976e92c294704b7b2e48358f43396");
        contracts.push(option);
        collateralDeposits.push(false);
        // fund the new contract with enough LINK tokens to make at least 1 Oracle request, with a buffer
        require(link.transfer(address(option), ORACLE_PAYMENT * 2), "nable to fund deployed contract");
        emit contractCreated(address(option), "Mavs_Blizzard_21-22");
    }

    /**
     * @dev Returns indexed contract
     */
    function getContract(
        uint _index
    )
        external
        view
        returns (BlizzardOption)
    {
        return contracts[_index];
    }

    /**
     * @dev Add a new node and associated job ID to the contract execution/evalution set
     */
    function addContractJob(
        uint256 _index,
        address _oracle,
        string memory _jobId
    ) 
        external 
        checkAccess 
    {
        contracts[_index].addOracleJob(_oracle, stringToBytes32(_jobId));
    }

    /**
     * @dev Remove a job from the contract execution set
     */
    function removeContractJob(
        uint256 _index,
        string memory _jobId
    )
        external
        checkAccess
    {
        contracts[_index].removeOracleJob(stringToBytes32(_jobId));
    }

    /**
     * @dev Request payout evaluation for indexed contract
     */
    function initiatePayoutEvaluation(
        uint256 _index
    ) 
        external 
        checkAccess 
    {
        BlizzardOption option = contracts[_index];
        option.requestPayoutEvaluation();

        uint256 payout = option.getPayout();
        unclaimedPayouts[option.getBuyer()] += payout;
        unclaimedPayouts[option.getProvider()] += option.getPremium() + option.getCollateral() - payout;
        
    }

    /**
     * @dev Request payout value for sender
     */
    function getPayout()
        public
        view
        returns (uint256)
    {
        return 
    }


    // /**
    //  * @dev Transfer nonzero payout balance to sender
    //  * 
    //  */
    // function withdraw() 
    //     public
    // {
    //     uint256 payout = unclaimedPayouts[msg.sender];
    //     unclaimedPayouts[msg.sender] = 0;
    //     require(usdc.transfer(msg.sender, payout), "unable to pay out to sender");
    // }

    /**
     * @dev Get the ETH/matic/gas balance of the provider contract
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
     * @dev Get the LINK balance of the provider contract
     */
    function getLINKBalance() 
        external 
        view 
        onlyOwner
        returns (uint256) 
    {
        return link.balanceOf(address(this));
    }

    /**
     * @dev Get the USDC/stablecoin balance of the provider contract
     */
    function getUSDCBalance() 
        external 
        view 
        onlyOwner
        returns (uint256) 
    {
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
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
     * REMOVE IN PRODUCTION
     */
    function endProviderContract() 
        external 
        onlyOwner 
    {
        for (uint256 i = 0; i != contracts.length; i += 1) {

            BlizzardOption option = contracts[i];
            uint256 payout = option.getPayout();
            uint256 premium = option.getPremium();

            if (option.getStatus()) {
                require(usdc.transfer(option.getBuyer(), payout), "unable to transfer payout to buyer");
                require(usdc.transfer(option.getProvider(), premium + option.getCollateral() - payout), "unable to return remaining funds to provider");
            } else {
                require(usdc.transfer(option.getBuyer(), premium), "unable to return premium to buyer");
                require(usdc.transfer(option.getProvider(), premium + option.getCollateral() - payout), "unable to return collateral to provider");
            }
            option.endContractInstance();
        }
        // transfer any remaining tokens held by this account before destroying
        require(usdc.transfer(owner(), usdc.balanceOf(address(this))), "unable to transfer USDC");
        require(link.transfer(owner(), link.balanceOf(address(this))), "unable to transfer LINK");
        selfdestruct(payable(owner()));
    }
}


contract BlizzardOption is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private constant END = 1649649600;

    uint256 private oraclePayment;
    mapping(bytes32 => uint256) public oracleMap;
    address[] public oracles;
    bytes32[] public jobIds;

    bool public contractActive;
    bool public contractEvaluated;
    uint256 private requestsPending;

    string[] dates;
    uint256 collateral;
    uint256 premium;
    uint256 payout;
    address provider;
    address buyer;

    /**
     * @dev Prevents a function being run unless the end date has been passed
     */
    modifier onContractEnded() {
        require(END < block.timestamp, "unable to call until coverage period has ended");
        _;
    }

    event contractEnded(address _contract, uint256 _end, uint256 _time);
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
        uint256 _collateral,
        uint256 _premium,
        address _link,
        address _provider,
        address _buyer
    ) 
        public
        onlyOwner
    {
        oraclePayment = _oracle_payment;
        collateral = _collateral;
        premium = _premium;
        setChainlinkToken(_link);
        provider = _provider;
        buyer = _buyer;
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
    function getCollateral() 
        public 
        view 
        returns (uint256) 
    {
        return collateral;
    }

    /**
     * @dev Get the payout value, may not be final
     */
    function getPremium() 
        public 
        view 
        returns (uint256) 
    {
        return premium;
    }

    /**
     * @dev Get the payout value, may not be final
     */
    function getProvider() 
        public 
        view 
        returns (address) 
    {
        return provider;
    }

    /**
     * @dev Get the payout value, may not be final
     */
    function getBuyer() 
        public 
        view 
        returns (address) 
    {
        return buyer;
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
            return payout / (oracles.length - requestsPending); // 0 if contract is active, "close" if contract is currently evaluating
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
            emit contractEnded(address(this), END, block.timestamp);

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
