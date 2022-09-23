// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/// @custom:security-contact daniel.parangi@arbolmarket.com
contract WeatherRiskNFT is 
    Initializable, ERC721Upgradeable, 
    ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, 
    PausableUpgradeable, AccessControlUpgradeable, 
    UUPSUpgradeable, ChainlinkClient {
    using Chainlink for Chainlink.Request;
    bytes32 private constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");     // Role to be granted (and subsequetly revoked) in event of required update
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");         // Arbol Admin (+optionally Arbol Operator)
    bytes32 private constant DEPUTY_ROLE = keccak256("DEPUTY_ROLE");         // Arbol Operator (+optionally Arbol Operator)
    bytes32 private constant CLIENT_ROLE = keccak256("CLIENT_ROLE");         // Client (+optionally Arbol Operator)
    address public constant PROVIDER_ADDRESS = 0xbf417C41F3ab1e01BD6867fB540dA7b734EaeA95;   // Provider (Polygon)
    address public constant STABLECOIN_ADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; // Polygon USDC token address
    address private constant LINK_ADDRESS = 0xb0897686c545045aFc77CF20eC7A532E3120E0F1;      // Polygon Link token address
    uint256 private constant DECIMALS = 6;                                                   // Polygon USDC decimals        
    uint256 private constant DISPUTE_PERIOD = 2 * 24 * 60 * 60;              // dispute period during which initially transferred payouts are held by smart contract before final settlement
    uint256 private constant EVALUATION_BUFFER = 14 * 24 * 60 * 60;          // additional period following coverage end date before evaluation can be initiated
    uint256 private constant ORACLE_PAYMENT = 0 * 10 ** 18;                  // Chainlink node payment amount, set to 0 when using Arbol's own node 
    uint256 private constant USD_CENTS_TO_USDC = 10 ** (DECIMALS - 2);       // conversion rate from cents to USDC
    uint256 private constant UNLIMITED_PROXY = 10 ** 16;                     // stablecoin.totalSupply() ~= 1779055220076765 ~= 1.7 * 10 ** 15 (~1.7B $USD)

    struct TokenState {             // token state values that are not writeable after initialization
        address mintReceiver;       // address to receive the minted token
        uint256 premium;            // premium amount, always in US cents, to transfer to mint receiver on contract acceptance
        uint256 startDate;          // unix timestamp of contract start date
        uint256 endDate;            // unix timestamp of contract end date
        string programName;         // name of contract program
        bytes nodeKey;              // AES key for contract URI encrypted with public key of Chainlink node
        bytes dappKey;              // AES key for contract URI encrypted with public key of dApp web server
    }

    struct TokenUpdate {            // token state values that are updated over the course of the token's life
        bool settled;               // set to true when determined payout has been transferred and result cannot be disputed, initialized to false
        bool disputed;              // set to true when evaluation is disputed within the dispute period and set to false when re-evaluated
        bool needsReencryption;     // set to true when transferred and set to false when re-encrypted
        uint256 evalTimestamp;      // timestamp of fulfillment of contract evaluation, initialized to 0
        uint256 computedPayout;     // computed payout result, always in US cents, only accurate once contract has been evaluated, initialized to 0
        bytes viewerKey;            // AES key for contract URI encrypted with public key of contract holder (if contract does not need re-encryption)
    }

    struct ChainlinkConfig {
        address operator;           // address of Chainlink operator contract watched by Chainlink node running the following evaluation and re-encryption jobs
        bytes32 evaluationJob;      // Chainlink job id for Arbol NFT evaluation
        bytes32 reencryptionJob;    // Chainlink job id for Arbol NFT re-encryption
    }

    struct EncryptionConfig {
        address nodeAddress;        // address whose private key is known to Chainlink node
        address dappAddress;        // address whose private key is known to dApp web server
        bytes nodePublicKey;        // public key of node address
        bytes dappPublicKey;        // public key of dapp address
    }

    mapping(uint256 => TokenState) public tokenStates;
    mapping(uint256 => TokenUpdate) public tokenUpdates;
    mapping(bytes32 => uint256) private _requestsIndex;

    ChainlinkConfig public chainlinkConfig;
    EncryptionConfig public encryptionConfig;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() 
        initializer 
        external 
    {
        __ERC721_init("WeatherRiskNFT", "WRSK");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ChainlinkClient_init();
        setChainlinkToken(LINK_ADDRESS);
        // set admin roles
        _grantRole(DEFAULT_ADMIN_ROLE, PROVIDER_ADDRESS);
        _grantRole(MINTER_ROLE, PROVIDER_ADDRESS);
        _grantRole(DEPUTY_ROLE, msg.sender);
        // initialize encryption and Chainlink configurations 
        chainlinkConfig = ChainlinkConfig(0x76dfA9a36db355F101B241b66e2fA97f7Ca09C24, "940708c3e44c40f1bd03d34c1b3edcf6", "49b9cb632adc4047be16a00b3edad9b8");       // Polygon
        encryptionConfig = EncryptionConfig(0x4506F70e253DEccCC1a419954606cB3D1E6a9a70, 0xAe76Be2fbCca75B039e42DEDDE12dd305f9FCdCe, hex"03cc7d57c51fe62090ddc345e0358cc820e9359e7e0f9b4cfb1df84a498c46e7f8", hex"026d93aec02db1f0cc8c69da667ba935c6618b6137bfecf9bdee2b044a44751a74");
    }

    /**
     * Initializes a tokenized contract to be minted to a specified address
     * and grants that address the Client role in order to view the contract
     * in the dApp frontend
     * @notice can only be called by a Minter, and requires that 'tokenId' is not 
     * the id of an already minted token
     * @param tokenId uint256 token id to approve for minting
     * @param tokenState TokenState struct (externally supplied as array) to approve
     */
    function preMint(uint256 tokenId, TokenState calldata tokenState)
        external
        onlyRole(MINTER_ROLE)
    {
        require(!_exists(tokenId), "TE1"); // Token Existence error location 1
        _grantRole(CLIENT_ROLE, tokenState.mintReceiver);
        tokenStates[tokenId] = tokenState;
    }

    /**
     * Mints an Arbol contract as an NFT, sends to client wallet, and authorizes 
     * transfer of contract premium from funding wallet to client wallet
     * @notice can only be called by the intended Client or a Deputy, and requires that
     * @dev does not enforce allowance checks for limits/payouts on mint receiever
     * as this should be done in the dApp frontend before minting
     * @param tokenId uint256 decimal representation of contract's ID (base64)
     * @param uri string URI of encrypted contract evaluation terms for NFT to be minted
     * @param viewerKey bytes AES key encrypted for 'to' address
     */
    function mint(uint256 tokenId, string calldata uri, bytes calldata viewerKey) 
        external 
        whenNotPaused
    {
        // check that token was pre approved
        require(tokenStates[tokenId].startDate > 0, "TA1"); // Token Approval error location 1
        // check that the caller is a Deputy or the risk address
        address mintReceiver = tokenStates[tokenId].mintReceiver;
        require(hasRole(DEPUTY_ROLE, msg.sender) || msg.sender == mintReceiver, "UC1"); // Unintended Caller error location 1  //  
        // mint and set uri
        _mint(mintReceiver, tokenId);
        _setTokenURI(tokenId, uri);
        // set token updates entry
        tokenUpdates[tokenId] =  TokenUpdate(false, false, false, 0, 0, viewerKey);
        // convert from cents to USDC with correct decimals before transferring premium to receiver
        LinkTokenInterface stablecoin = LinkTokenInterface(STABLECOIN_ADDRESS);
        require(stablecoin.transferFrom(PROVIDER_ADDRESS, mintReceiver, tokenStates[tokenId].premium * USD_CENTS_TO_USDC), "IA1"); // Insufficient Allowance error location 1
    }

    // Evaluation methods

    /**
     * Issues a Chainlink request to decrypt the contract terms
     * and compute an evaluated payout result
     * @notice requires that the current block timestamp be sufficiently after the contract end date 
     * before evaluation can be initiated, and re-evaluating a contract requires that the contract 
     * result be in dispute
     * @param tokenId uint256 token ID of contract to be evaluated
     */
    function requestEvaluation(uint256 tokenId) 
        external 
    {
        // check that coverage period has elapsed (including evaluation buffer)
        uint256 endDate = tokenStates[tokenId].endDate;
        require(endDate + EVALUATION_BUFFER < block.timestamp, "TT1"); // Timing Threshold error location 1
        // check that either the contract has not yet been evaluated or it has but it is disputed
        require(tokenUpdates[tokenId].evalTimestamp == 0 || tokenUpdates[tokenId].disputed, "IS1"); // Invalid State error location 1
        // build, send, and log Chainlink evaluation request
        Chainlink.Request memory req = buildChainlinkRequest(chainlinkConfig.evaluationJob, address(this), this.fulfillEvaluation.selector);
        req.addBytes("nodeKey", tokenStates[tokenId].nodeKey);      // encrypted decryption key
        req.add("uri", super.tokenURI(tokenId));                    // encrypted contract terms
        req.addUint("startDate", tokenStates[tokenId].startDate);   // contract coverage period start date
        req.addUint("endDate", endDate);                                // contract coverage period end date
        req.add("programName", tokenStates[tokenId].programName);   // contract program name
        bytes32 requestId = sendChainlinkRequestTo(chainlinkConfig.operator, req, ORACLE_PAYMENT);
        _requestsIndex[requestId] = tokenId;
    }

    /**
     * Callback function for Chainlink evaluation request, updates the contract's
     * state with the current evaluation timestamp and the returned payout
     * @notice only changes state if the contract has not been evaluated before or
     * if the contract is currently being disputed
     * @param _requestId bytes32 request ID for associated evaluation job
     * @param _payout uint256 payout evaluation result (in cents)
     */
    function fulfillEvaluation(bytes32 _requestId, uint256 _payout)
        external
        recordChainlinkFulfillment(_requestId)
    {   
        // set token if evaluated first time or update if disputed
        uint256 tokenId = _requestsIndex[_requestId];
        // TokenUpdate storage tokenUpdate = tokenUpdates[_tokenId];
        bool disputed = tokenUpdates[tokenId].disputed;
        if (tokenUpdates[tokenId].evalTimestamp == 0 || disputed) {
            tokenUpdates[tokenId].evalTimestamp = block.timestamp;
            tokenUpdates[tokenId].computedPayout = _payout;
            if (disputed) {
                tokenUpdates[tokenId].disputed = false;
            }
        }
    }

    /**
     * Allows an authorized caller to dispute a recent payout evaluation
     * @notice can only be called by a Deputy or the token owner, and requires that the 
     * contract has been evaluated, that it is not currently in dispute, that the 
     * dispute period has not elapsed, and that the contract is not yet setttled
     * @param tokenId uint256 id of token for which to dispute the evaluation results
     */
    function disputeEvaluation(uint256 tokenId)
        external
    {
        // check that caller owns token or is deputized
        require(hasRole(DEPUTY_ROLE, msg.sender) || msg.sender == ownerOf(tokenId), "UC2"); // Unintended Caller error location 2
        // check that token has been evaluated at least once
        uint256 evalTimestamp = tokenUpdates[tokenId].evalTimestamp;
        require(evalTimestamp > 0, "IS2"); // Invalid State error location 2
        // check that token is not settled
        require(!tokenUpdates[tokenId].settled, "IS3"); // Invalid State error location 3
        // check that token is not disputed
        require(!tokenUpdates[tokenId].disputed, "IS4"); // Invalid State error location 4
        // check that dispute period has not elapsed
        require(evalTimestamp + DISPUTE_PERIOD > block.timestamp, "TT2"); // Timing Threshold error location 2
        // set dispute flag
        tokenUpdates[tokenId].disputed = true;
    }

    /**
     * Completes the settlement of a specified contract by updating the contract
     * state and transferring the final payout amount to the provider address
     * @notice can only be called by a Deputy or the token owner, and requires that the
     * contract has been evaluated, that it is not currently in dispute, that the 
     * dispute period has fully elapsed, and that the contract is not yet setttled,
     * additionally if the token owner at the time of settlement has not approved a 
     * sufficient allowance to cover the payout then the original mint receiver becomes 
     * responsible for settling the payout figure
     * @dev does not enforce allowance checks for payouts on token owner 
     * as this should be done in the dApp frontend before settling
     * @param tokenId uint256 id of token for which to settle payout
     */
    function settleContract(uint256 tokenId)
        external
        whenNotPaused
    {
        require(hasRole(DEPUTY_ROLE, msg.sender) || msg.sender == ownerOf(tokenId), "UC3"); // Unintended Caller error location 3
        // check that token has been evaluated at least once
        uint256 evalTimestamp = tokenUpdates[tokenId].evalTimestamp;
        require(evalTimestamp > 0, "IS5"); // Invalid State error location 5
        // check that the token is not settled
        require(!tokenUpdates[tokenId].settled, "IS6"); // Invalid State error location 6
        // check that the token is not disputed
        require(!tokenUpdates[tokenId].disputed, "IS7"); // Invalid State error location 7
        // check that the dispute period has elapsed
        require(evalTimestamp + DISPUTE_PERIOD < block.timestamp, "TT3"); // Timing Threshold erorr location 3
        // update states
        tokenUpdates[tokenId].settled = true;
        // send final payout back to provider for fiat distribution
        LinkTokenInterface stablecoin = LinkTokenInterface(STABLECOIN_ADDRESS);
        // convert from cents to USDC with correct decimals before transferring premium to receiver
        address payer = ownerOf(tokenId);
        uint256 payout = tokenUpdates[tokenId].computedPayout;
        if (stablecoin.allowance(address(this), payer) < payout) {
            payer = tokenStates[tokenId].mintReceiver;
        }
        require(stablecoin.transferFrom(payer, PROVIDER_ADDRESS, payout * USD_CENTS_TO_USDC), "IA2"); // Insufficient Allowance error location 2
    }

    // Update methods

    /**
     * Issues a Chainlink request to re-encrypt the viewer's AES key
     * with the new holder's public key after transfers
     * @notice can only be called by the token owner, and requires that the
     * token not already be encrypted for the caller
     * @param tokenId uint256 token ID of contract to be re-encrypted
     * @param publicKey bytes viewer public key
     */
    function requestReencryption(uint256 tokenId, bytes calldata publicKey) 
        external 
    {
        // check that caller is owner of token
        require(ownerOf(tokenId) == msg.sender, "UC4"); // Unintended Caller error location 4
        // check that the contract currently needs re-encryption
        require(tokenUpdates[tokenId].needsReencryption, "IS8"); // Invalid State error location 8
        // build, send, and log Chainlink re-encryption request
        Chainlink.Request memory req = buildChainlinkRequest(chainlinkConfig.reencryptionJob, address(this), this.fulfillReencryption.selector);
        req.addBytes("nodeKey", tokenStates[tokenId].nodeKey);
        req.addBytes("viewerAddressPublicKey", publicKey);
        bytes32 requestId = sendChainlinkRequestTo(chainlinkConfig.operator, req, ORACLE_PAYMENT);
        _requestsIndex[requestId] = tokenId;
    }

    /**
     * Callback function for Chainlink evaluation request, updates contract state data 
     * after successful re-encryption job
     * @param _requestId bytes32 request ID for associated evaluation job
     * @param _key bytes URI AES key encrypted with the public key of the NFT holder
     */
    function fulfillReencryption(bytes32 _requestId, bytes memory _key)
        external
        recordChainlinkFulfillment(_requestId)
    {
        uint256 tokenId = _requestsIndex[_requestId];
        if (tokenUpdates[tokenId].needsReencryption) {
            // set encryption results
            tokenUpdates[tokenId].needsReencryption = false;
            tokenUpdates[tokenId].viewerKey = _key;
        }
    }

    // Additional permissioned methods

    /**
     * Method for resetting chainlink config in the event of a required operator change
     * @notice can only be called by an Upgrader
     * @param _chainlinkConfig ChainlinkConfig struct to set
     */
    function setChainlinkConfig(ChainlinkConfig calldata _chainlinkConfig)
        external
        onlyRole(UPGRADER_ROLE)
        whenPaused
    {
        chainlinkConfig = _chainlinkConfig;
    }

    /**
     * Method for resetting encryption config in the event of key rotations
     * @notice can only be called by an Upgrader
     * @param _encryptionConfig EncryptionConfig struct to set
     */
    function setEncryptionConfig(EncryptionConfig calldata _encryptionConfig)
        external
        onlyRole(UPGRADER_ROLE)
        whenPaused
    {
        encryptionConfig = _encryptionConfig;
    }

    /**
     * @notice can only be called by a Deputy
     */
    function pause() 
        external 
        onlyRole(DEPUTY_ROLE) 
    {
        _pause();
    }

    /**
     * @notice can only be called by a Deputy
     */
    function unpause() 
        external 
        onlyRole(DEPUTY_ROLE) 
    {
        _unpause();
    }

    // The following functions are overrides required by Solidity.

    /**
     * @param tokenId uint256 token ID for URI to retrieve
     * @return string URI of specified contract
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        whenNotPaused
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @notice grants Client role to transfer receiver and updates
     * need for reencryption
     */
    function _afterTokenTransfer(address from, address to, uint256 tokenId)
        internal
        whenNotPaused
        override(ERC721Upgradeable)
    {
        super._afterTokenTransfer(from, to, tokenId);
        _grantRole(CLIENT_ROLE, to);
        tokenUpdates[tokenId].needsReencryption = true;
    }

    /**
     * @notice can only be called by an Upgrader
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}