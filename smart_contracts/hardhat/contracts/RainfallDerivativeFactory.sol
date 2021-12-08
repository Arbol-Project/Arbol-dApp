// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

contract DerivativeProvider is ChainlinkClient, ConfirmedOwner {
    uint256 private constant ORACLE_PAYMENT = 1 * 10**16; // 0.01 LINK
    address public provider;
    mapping(address => ClimateOption) contracts;

    constructor() ConfirmedOwner(msg.sender) {
        setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
        provider = msg.sender;
    }

    /**
     * @dev Event to log when a contract is created
     */
    event contractCreated(address _contract, string _id);

    /**
     * @dev Create a new contract for client, automatically approved and deployed to the blockchain
     */
    function newContract(
        string memory _id,
        string memory _program,
        string memory _dataset,
        string memory _opt_type,
        string[] memory _locations,
        uint256 _start,
        uint256 _end,
        uint256 _strike,
        uint256 _limit,
        uint256 _exhaust
    ) external onlyOwner {
        ClimateOption i = new ClimateOption(
            _program,
            _dataset,
            _opt_type,
            _locations,
            _start,
            _end,
            _strike,
            _limit,
            _exhaust,
            ORACLE_PAYMENT,
            provider
        );
        contracts[address(i)] = i;
        emit contractCreated(address(i), _id);

        // manually fund the new contract with enough LINK tokens to make at least 1 Oracle request, with a buffer
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(
            link.transfer(address(i), ORACLE_PAYMENT * 2),
            "Unable to fund deployed contract"
        );
    }

    /**
     * @dev Returns the contract for a given address
     */
    function getContract(address _contract)
        external
        view
        returns (ClimateOption)
    {
        return contracts[_contract];
    }

    /**
     * @dev Request evaluation of a given contract
     */
    function getContractEvaluation(address _contract) external onlyOwner {
        return contracts[_contract].requestPayoutEvaluation();
    }

    /**
     * @dev Request payout value for a given contract
     */
    function getContractPayout(address _contract)
        external
        view
        returns (uint256)
    {
        return contracts[_contract].getPayout();
    }

    /**
     * @dev add a new node and associated job ID to the contract evaluator set
     */
    function addContractJob(
        address _contract,
        address _oracle,
        bytes32 _job
    ) external onlyOwner {
        contracts[_contract].addOracleJob(_oracle, _job);
    }

    /**
     * @dev remove a node and associated job ID from the contract evaluator set
     */
    function removeContractJob(address _contract, address _oracle)
        external
        onlyOwner
    {
        contracts[_contract].removeOracleJob(_oracle);
    }

    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
     */
    function endContractInstance(address _contract) external onlyOwner {
        contracts[_contract].endContractInstance();
    }

    /**
     * @dev Get the matic balance of the provider contract
     */
    function getMATICBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get the link balance of the provider contract
     */
    function getLINKBalance() external view returns (uint256) {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        return link.balanceOf(address(this));
    }

    /**
     * @dev Get the current date/time according to the blockchain
     */
    function getBlockTimeStamp() external view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev Get address of the chainlink token
     */
    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
     */
    function endProviderContract() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(
            link.transfer(provider, link.balanceOf(address(this))),
            "Unable to transfer"
        );
        selfdestruct(payable(provider));
    }
}

contract ClimateOption is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private oraclePaymentAmount;
    mapping(address => uint256) public oracleMap;
    // set oracles here before deploying
    address[] public oracles = [0x7bcfF26a5A05AF38f926715d433c576f9F82f5DC];
    bytes32[] public jobIds = [
        stringToBytes32("6de976e92c294704b7b2e48358f43396")
    ];
    address public provider;
    bool public contractActive;
    bool public contractEvaluated;
    uint256 private requestsPending;

    string private id;
    string private program;
    string private dataset;
    string private opt_type;
    string[] private locations;
    uint256 private start;
    uint256 private end;
    uint256 private strike;
    uint256 private limit;
    uint256 private exhaust;
    uint256 private payout;
    uint256 private agg_result;

    /**
     * @dev Prevents a function being run unless the end date has been passed
     */
    modifier onContractEnded() {
        require(
            end < block.timestamp,
            "cannot call until coverage period has ended"
        );
        _;
    }

    /**
     * @dev Prevents a function being run unless the contract has been evaluated
     */
    modifier onContractEvaluated() {
        require(
            contractEvaluated,
            "cannot call until coverade period has ended"
        );
        _;
    }

    event contractEnded(address _contract, uint256 _end, uint256 _time);
    event contractEvaluationRequested(
        address _contract,
        bytes32 _req,
        address _oracle,
        uint256 _time
    );
    event contractEvaluationFulfilled(
        address _contract,
        uint256 _time,
        uint256 _payout
    );

    /**
     * @dev Creates a new climate options contract
     */
    constructor(
        string memory _program,
        string memory _dataset,
        string memory _opt_type,
        string[] memory _locations,
        uint256 _start,
        uint256 _end,
        uint256 _strike,
        uint256 _limit,
        uint256 _exhaust,
        uint256 _oraclePaymentAmount,
        address _provider
    ) ConfirmedOwner(msg.sender) {
        setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);

        for (uint256 i = 0; i != oracles.length; i += 1) {
            oracleMap[oracles[i]] = i;
        }

        oraclePaymentAmount = _oraclePaymentAmount;
        provider = _provider;
        program = _program;
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
    }

    /**
     * @dev Makes a request to the oracle hosting the Arbol dApp external adapter and associated job
     * to determine a contracts payout after the coverage period has ended
     */
    function requestPayoutEvaluation() public onlyOwner onContractEnded {
        if (contractActive) {
            contractActive = false;
            emit contractEnded(address(this), end, block.timestamp);

            for (uint256 i = 0; i != oracles.length; i += 1) {
                Chainlink.Request memory req = buildChainlinkRequest(
                    jobIds[i],
                    address(this),
                    this.fulfillPayoutEvaluation.selector
                );
                req.add("program", program);
                req.add("dataset", dataset);
                req.add("opt_type", opt_type);
                req.addStringArray("locations", locations);
                req.addUint("start", start);
                req.addUint("end", end);
                req.addUint("strike", strike);
                req.addUint("limit", limit);
                req.addUint("exhaust", exhaust);
                bytes32 requestId = sendChainlinkRequestTo(
                    oracles[i],
                    req,
                    oraclePaymentAmount
                );
                requestsPending += 1;
                emit contractEvaluationRequested(
                    address(this),
                    requestId,
                    oracles[i],
                    block.timestamp
                );
            }
        }
    }

    function fulfillPayoutEvaluation(bytes32 _requestId, uint256 _result)
        public
        recordChainlinkFulfillment(_requestId)
    {
        agg_result += _result;
        requestsPending -= 1;
        if (requestsPending == 0) {
            payout = agg_result / oracles.length;
            contractEvaluated = true;
            emit contractEvaluationFulfilled(
                address(this),
                block.timestamp,
                payout
            );

            LinkTokenInterface link = LinkTokenInterface(
                chainlinkTokenAddress()
            );
            require(
                link.transfer(provider, link.balanceOf(address(this))),
                "Unable to transfer remaining LINK tokens"
            );
        }
    }

    /**
     * @dev Get the payout value
     */
    function getPayout() public view onContractEvaluated returns (uint256) {
        return payout;
    }

    /**
     * @dev add a new node and associated job ID to the contract evaluator set
     */
    function addOracleJob(address oracle, bytes32 jobId) public onlyOwner {
        oracles.push(oracle);
        jobIds.push(jobId);
        oracleMap[oracle] = oracles.length - 1;
    }

    /**
     * @dev remove a node and associated job ID from the contract evaluator set
     */
    function removeOracleJob(address oracle) public onlyOwner {
        uint256 index = oracleMap[oracle];
        oracles[index] = oracles[oracles.length - 1];
        oracles.pop();
        jobIds[index] = jobIds[jobIds.length - 1];
        jobIds.pop();
        oracleMap[oracles[index]] = index;
    }

    /**
     * @dev Get address of the chainlink token
     */
    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function stringToBytes32(string memory source)
        private
        pure
        returns (bytes32 result)
    {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }

    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc,
     * funds are returned to the contract provider, including any remaining LINK tokens
     */
    function endContractInstance() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(
            link.transfer(provider, link.balanceOf(address(this))),
            "Unable to transfer"
        );
        selfdestruct(payable(provider));
    }
}
