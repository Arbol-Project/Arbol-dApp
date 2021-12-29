# Arbol-dApp

Arbol-dApp "Monorepo".

# Web App (off-chain)

[in progress]

# Chainlink Node (bridge)

A Docker Compose project to launch an Arbol-Chainlink node on a new AWS EC2 (Amazon Linux 2) instance. The project deploys containers for
a Chainlink node for fulfilling smart contract oracle requests, an IPFS daemon for retrieving Arbol weather data and listening to IPFS-HTTP requests, and a Guicorn server running a Chainlink external adapter for serving requests and computing payout evaluations on retrieved data.

To launch a new node with new or imported credentials and contract data, run the following:

```
sudo yum install -y git
git clone --recurse-submodules https://github.com/dmp267/Arbol-dApp.git
bash Arbol-dApp/chainlink_node/scripts/setup-AWS.sh
exit

# forward credentials from Arbol-dApp repo on local machine
bash chainlink_node/scripts/send-secrets.sh

# log back in and set sensitive data
bash Arbol-dApp/chainlink_node/scripts/receive-secrets.sh
cd Arbol-dApp/chainlink_node
docker compose up --build
```

The Chainlink Node GUI can be accessed at ```https://localhost:6689``` (if SSH tunneling into EC2 instance on a VPC add ```-L 6689:localhost:6689``` to forward to your local machine).

The IPFS Webui can be accessed at ```http://localhost:5001/webui``` (if SSH tunneling into EC2 instance on a VPC add ```-L 5001:localhost:5001``` to forward to your local machine).

# Smart Contracts (on-chain)

This directory holds smart contract source for Arbol derivative deals, Hardhat testing, deployment, and manual evaluation scripts, Chainlink oracle job definitions, and contract deployment records.

To deploy, verify, and test smart contracts located in ```smart_contracts/hardhat/contracts```, first make sure Hardhat
is installed locally, then run the following:

```
# from Arbol-dApp
cd smart_contracts/hardhat
npx hardhat run scripts/deploy-all.js # or replace with specific deployment script
npx hardhat run scripts/verify-deployments.js
npx hardhat run scripts/evaluate-deployments.js
```

Deployment details can be viewed in ```smart_contracts/hardhat/logs```. Depending on the contract, evaluation may fail if certain conditions are not met (for example, for all contracts, LINK token provider must first approve derivativeProvider contract to move funds for oracle requests).
