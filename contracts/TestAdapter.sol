// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

contract ClimateOptionTest is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private constant oraclePaymentAmount = 1 * LINK_DIVISIBILITY;
    address[] public oracles;
    bytes32[] public jobIds;
    address public provider;
    bool public contractActive;
    bool public contractEvaluated;

    string private dataset;
    string private opt_type;
    string[] private locations;
    uint256 private start;
    uint256 private end;
    uint256 private strike;
    uint256 private limit;
    uint256 private exhaust;
    uint256 private payout;

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

    event contractCreated(
        address _contract,
        uint256 _start,
        uint256 _end,
        uint256 _limit
    );
    event contractEnded(address _contract, uint256 _end, uint256 _time);
    event contractEvaluationRequested(
        address _contract,
        bytes32 _req,
        uint256 _time
    );
    event contractEvaluationFulfilled(
        address _contract,
        bytes32 _req,
        uint256 _time,
        uint256 _payout
    );

    /**
     * @dev Creates a new test contract
     */
    constructor() ConfirmedOwner(msg.sender) {
        setPublicChainlinkToken();

        oracles = [0xe9d0d0332934c269132e53c03D3fD63EbA41aae0];
        jobIds = [stringToBytes32('6c5f2d44a1254ce79912749478dc734c')];

        provider = msg.sender;
        dataset = "chirpsc_final_25-daily";
        opt_type = "CALL";
        locations = [
            "[12.76727009, 104.01941681]",
            "[12.76727009, 104.26941681]",
            "[13.01727009, 104.01941681]",
            "[13.01727009, 104.26941681]",
            "[13.26727009, 104.01941681]",
            "[13.26727009, 104.26941681]",
            "[13.51727009, 104.01941681]",
            "[13.51727009, 104.26941681]"
        ];
        start = 1627790400;
        end = 1632974400;
        strike = 60900;
        limit = 53444;
        exhaust = 84400;
        contractActive = true;
        contractEvaluated = false;
        emit contractCreated(address(this), start, end, limit);
    }

    /**
     * @dev Makes a request to the oracle hosting the Arbol dApp external adapter and associated job
     * to determine a contracts payout after the coverage period has ended
     */
    function requestPayoutEvaluation() public onlyOwner onContractEnded {
        if (contractActive) {
            contractActive = false;
            emit contractEnded(address(this), end, block.timestamp);
            Chainlink.Request memory req = buildChainlinkRequest(
                jobIds[0],
                address(this),
                this.fulfillPayoutEvaluation.selector
            );
            req.add("dataset", dataset);
            req.add("opt_type", opt_type);
            req.addStringArray("locations", locations);
            req.addUint("start", start);
            req.addUint("end", end);
            req.addUint("strike", strike);
            req.addUint("limit", limit);
            req.addUint("exhaust", exhaust);
            bytes32 requestId = sendChainlinkRequestTo(
                oracles[0],
                req,
                oraclePaymentAmount
            );
            emit contractEvaluationRequested(
                address(this),
                requestId,
                block.timestamp
            );
        }
    }

    function fulfillPayoutEvaluation(bytes32 _requestId, uint256 _result)
        public
        recordChainlinkFulfillment(_requestId)
    {
        payout = _result;
        contractEvaluated = true;
        emit contractEvaluationFulfilled(
            address(this),
            _requestId,
            block.timestamp,
            _result
        );
    }

    /**
     * @dev Get the payout value
     */
    function getPayout() public view onContractEvaluated returns (uint256) {
        return payout;
    }

    /**
     * @dev Get the link balance of the contract
     */
    function setContractStatus() external onlyOwner {
        contractActive = true;
        payout = 0;
    }

    /**
     * @dev Get the eth balance of the contract
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get the link balance of the contract
     */
    function getLINKBalance() external view returns (uint256) {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        return link.balanceOf(address(this));
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
    function getStartDate() external view returns (uint256) {
        return start;
    }

    /**
     * @dev Get the contract end date
     */
    function getEndDate() external view returns (uint256) {
        return end;
    }

    /**
     * @dev Get the contract strike
     */
    function getStrike() external view returns (uint256) {
        return strike;
    }

    /**
     * @dev Get the contract limit
     */
    function getLimit() external view returns (uint256) {
        return limit;
    }

    /**
     * @dev Get the contract exhaust
     */
    function getExhaust() external view returns (uint256) {
        return exhaust;
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
    function endContractInstance() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(getChainlinkToken());
        require(
            link.transfer(provider, link.balanceOf(address(this))),
            "Unable to transfer"
        );
        selfdestruct(payable(provider));
    }
}
