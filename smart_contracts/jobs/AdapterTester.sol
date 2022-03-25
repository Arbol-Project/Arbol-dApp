// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

contract MumbaiTester is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    uint256 private constant ORACLE_PAYMENT = 0 * 10**2;
    address constant LINK_ADDRESS = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB;
    address constant OPERATOR_ADDRESS = 0x59FA4e3Fd486E5798C8F8d884f0F65A51A5dFF43;
    bytes32 constant JOB_ID = "b886eeae31f746ac898c5b568a9a5503";
    string request_URL = "/apiv3/grid-history/chirpsc_final_25-daily/13.34126091_103.39190674";
    string[] request_ops = ["mean"];
    string[] request_params = ["[True, False]"];
    uint256 public data;
    string public unit;

    constructor()
    {
        setChainlinkToken(LINK_ADDRESS);
    }

    function sendRequest()
        public
    {
        Chainlink.Request memory req = buildChainlinkRequest(JOB_ID, address(this), this.fulfillRequest.selector);
        req.add("request_url", request_URL);
        req.addStringArray("request_ops", request_ops);
        req.addStringArray("request_params", request_params);
        sendChainlinkRequestTo(OPERATOR_ADDRESS, req, ORACLE_PAYMENT);
    }

    /**
     * @dev Callback function for chainlink oracle requests
        expected output ~0.13754 inch
     */
    function fulfillRequest(bytes32 _requestId, uint256 _result, string memory _unit)
        public
        recordChainlinkFulfillment(_requestId)
    {
        data = _result;
        unit = _unit;
    }
}

contract RinkebyTester is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    uint256 private constant ORACLE_PAYMENT = 0 * 10**2;
    address constant LINK_ADDRESS = 0x01BE23585060835E02B77ef475b0Cc51aA1e0709;
    address constant OPERATOR_ADDRESS = 0xA3ee2ccC1D79023E2b02d411a0408A0340fea252;
    bytes32 constant JOB_ID = "c248067fed5c484f907690165535601a";
    string request_URL = "/apiv3/dutch-station-history/209/WINDSPEED?use_imperial_units=true";
    string[] request_ops = ["last", "max"];
    string[] request_params = ["[False, True, '1M']", "[True, False]"];
    uint256 public data;
    string public unit;

    constructor()
    {
        setChainlinkToken(LINK_ADDRESS);
    }

    function sendRequest()
        public
    {
        Chainlink.Request memory req = buildChainlinkRequest(JOB_ID, address(this), this.fulfillRequest.selector);
        req.add("request_url", request_URL);
        req.addStringArray("request_ops", request_ops);
        req.addStringArray("request_params", request_params);
        sendChainlinkRequestTo(OPERATOR_ADDRESS, req, ORACLE_PAYMENT);
    }

    /**
     * @dev Callback function for chainlink oracle requests
        expected output 21.92 miles per hour (x1e18)
     */
    function fulfillRequest(bytes32 _requestId, uint256 _result, string memory _unit)
        public
        recordChainlinkFulfillment(_requestId)
    {
        data = _result;
        unit = _unit;
    }
}