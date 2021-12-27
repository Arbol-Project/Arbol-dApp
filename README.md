# Arbol-dApp

This repository contains all components for Arbol dApp.

# Frontend (off-chain)

[in progress]

# Chainlink Node (bridge)

A Docker Compose project to launch an Arbol-Chainlink node on a new AWS EC2 instance. The project deploys containers for
a Chainlink node for fulfilling smart contract oracle requests, an IPFS daemon for retrieving Arbol weather data and listening to IPFS-HTTP requests, and a Chainlink external adapter run as a Guicorn server for serving requests and computing payout evaluations on retrieved data.

Follow the steps below with the proper credentials to launch a new node:

```
sudo yum install -y git
git clone --recurse-submodules https://github.com/dmp267/Arbol-dApp.git
bash Arbol-dApp/chainlink_node/setup-AWS.sh
exit
# forward credentials from Arbol-dApp on local machine
bash chainlink_node/send-secrets.sh
# log back in and set sensitive data
bash Arbol-dApp/chainlink_node/receive-secrets.sh
docker compose up --build
```

# Smart Contracts (on-chain)

This directory holds smart contract source for Arbol derivative deals, Hardhat testing and deployment scripts, Chainlink oracle job definitions, and contract deployment records.