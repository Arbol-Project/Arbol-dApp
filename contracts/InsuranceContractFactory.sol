// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
pragma experimental ABIEncoderV2;

// npm install @chainlink/contracts @openzeppelin/contracts
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "@chainlink/contracts/src/v0.6/vendor/SafeMathChainlink.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";


contract InsuranceProvider {

    AggregatorV3Interface internal priceFeed;
    uint256 constant private ORACLE_PAYMENT = 0.1 * 10**18; // 0.1 LINK
    address public constant LINK_KOVAN = 0xa36085F69e2889c224210F603D836748e7dC0088 ; // LINK token address on Kovan
    address payable public insurer = msg.sender;
    mapping (address => InsuranceContract) contracts;

    constructor()   public payable {
        priceFeed = AggregatorV3Interface(0x9326BFA02ADD2366b30bacB125260Af641031331);
    }

    /**
     * @dev Prevents a function being run unless it's called by the Insurance Provider
     */
    modifier onlyOwner() {
        require(insurer == msg.sender,'Only Insurance provider can do this');
        _;
    }

   /**
    * @dev Event to log when a contract is created
    */
    event contractCreated(address _insuranceContract, uint _totalCover);

    /**
     * @dev Create a new contract for client, automatically approved and deployed to the blockchain
     */
    function newContract(address payable _client, uint _start, string _end, string[] _locations, string _dataset, uint _strike, uint _limit, uint _exhasut) public payable onlyOwner() returns(address) {

        // create contract, send payout amount so contract is fully funded plus a small buffer
        InsuranceContract i = (new InsuranceContract){value:(_limit * 1 ether).div(uint(getLatestPrice()))}(_client,
                                                                                                            _start,
                                                                                                            _end,
                                                                                                            _locations,
                                                                                                            _dataset,
                                                                                                            _strike,
                                                                                                            _limit,
                                                                                                            _exhaust,
                                                                                                            _opt_type,
                                                                                                            LINK_KOVAN,
                                                                                                            ORACLE_PAYMENT
                                                                                                            );
        contracts[address(i)] = i;
        emit contractCreated(address(i), msg.value, _limit);

        // fund the contract with enough LINK tokens to fullfil at least 1 Oracle, with a buffer
        LinkTokenInterface link = LinkTokenInterface(i.getChainlinkToken());
        link.transfer(address(i), ORACLE_PAYMENT * 4);
        return address(i);
    }

    /**
     * @dev returns the contract for a given address
     */
    function getContract(address _contract) external view returns (InsuranceContract) {
        return contracts[_contract];
    }

    /**
     * @dev updates the contract for a given address
     */
    function updateContract(address payable _contract) external {
        InsuranceContract i = InsuranceContract(_contract);
        i.updateContract();
    }

    /**
     * @dev gets the data request count for a given contract address
     */
    function getContractRequestCount(address payable _contract) external view returns(uint) {
        InsuranceContract i = InsuranceContract(_contract);
        return i.getRequestCount();
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
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }

    /**
     * @dev Function to end provider contract, in case of bugs or needing to update logic etc, funds are returned to insurance provider, including any remaining LINK tokens
     */
    function endContractProvider() external payable onlyOwner() {
        LinkTokenInterface link = LinkTokenInterface(LINK_KOVAN);
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
        selfdestruct(insurer);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    /**
     * @dev fallback function, to receive ether
     */
    receive() external payable {  }
    fallback() external payable {  }
}
