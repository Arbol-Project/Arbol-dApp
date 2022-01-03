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

(Comment out the line `python3 utils/preload_adapter.py` in `adapter/entrypoint.sh` to ignore the requirements in the last two lines)
- Required Chainlink environment variables to set in `chainlink/.env`:
    - `ETH_CHAIN_ID`: Chain ID for desired network (e.g. 42 for Kovan)
    - `LINK_CONTRACT_ADDRESS`: LINK token address (e.g. 0xa36085F69e2889c224210F603D836748e7dC0088 for Kovan)
    - `ETH_URL`: node provider web socket ([Infura](https://infura.io/), [Alchemy](https://www.alchemy.com/), etc)
    - `ETH_HTTP_URL`: HTTP node provider address (Infura, Alchemy, etc)
    - `TLS_CERT_PATH`: self-sign TLS certificates and move to `chainlink/tls`
    - `TLS_KEY_PATH`: self-sign TLS certificates and move to `chainlink/tls`
    - `DATABASE_URL`: setup Postgres DB and set connection string
- If deploying to a new chain for the first time, first deploy an [Oracle.sol](https://remix.ethereum.org/#url=https://docs.chain.link/samples/NodeOperators/Oracle.sol&optimize=false&runs=200&evmVersion=null) contract or an [Operator.sol](https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.7/Operator.sol) contract for Multi-word requests and record the `Oracle` address
- Start the app/node (run `docker compose up --build`) and sign into the Chainlink GUI
    - Add all desired jobs with `Oracle` address and save IDs and `Node` address
    - Call setFulfillmentPermission on the deployed `Oracle` contract with `Node` address
    - Send some ETH/MATIC/Gas to `Node` address so that it can write back to chain to fulfill requests
    - Add `Oracle` address and job IDs to desired smart contracts