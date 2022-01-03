# Chainlink Node Setup

TODO when initializing new Chainlink Node:

- Necessary files for proper initialization:
    - `chainlink/.env`  
    - `chainlink/.api`              (Chainlink GUI login credentials)
    - `chainlink/.password`         (Chainlink node wallet password)
    - `chainlink/tls/server.crt`
    - `chainlink/tls/server.key`
    - `../web_app/packages/contracts/src/logs/contracts.json`
    - `../smart_contracts/hardhat/SROs`
- Required Chainlink environment variables to set in `chainlink/.env`:
    - `ETH_CHAIN_ID`: Chain ID for desired network (e.g. 42 for Kovan)
    - `LINK_CONTRACT_ADDRESS`: LINK token address for desired network (e.g. "0xa36085F69e2889c224210F603D836748e7dC0088" for Kovan)
    - `ETH_URL`: node provider web socket (Infura, Alchemy, etc)
    - `ETH_HTTP_URL`: HTTP node provider address (Infura, Alchemy, etc)
    - `TLS_CERT_PATH`: self-sign TLS certificates and move to `chainlink/tls`
    - `TLS_KEY_PATH`: self-sign TLS certificates and move to `chainlink/tls`
    - `DATABASE_URL`: setup Postgres DB and set connection string
- Deploy [Oracle.sol](https://remix.ethereum.org/#url=https://docs.chain.link/samples/NodeOperators/Oracle.sol&optimize=false&runs=200&evmVersion=null) contract and record address
- Run `docker compose up` and sign into the Chainlink GUI
    - Add all desired jobs with `Oracle` address and save IDs and node address
    - Call setFulfillmentPermission on the deployed `Oracle` contract with node address
    - Send some ETH/MATIC/Gas to the node address so that it can write back to chain to fulfill requests
    - Add oracle address and job IDs to desired smart contracts