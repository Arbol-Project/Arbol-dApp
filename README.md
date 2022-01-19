# Arbol-dApp

Arbol-dApp Monorepo.

## Web App

The frontend is a [Node](https://nodejs.org/en/) app bootstrapped with [Create Eth App](https://github.com/paulrberg/create-eth-app) and hosted by [Heroku](https://www.heroku.com/) at [arbol-dapp.xyz](https://www.arbol-dapp.xyz). The site displays an interface for the deployed Blizzard Derivative Provider contract on Polygon Mainnet, allowing predetermined parties to execute agreed upon transactions, and will in the future provide views for all on-chain contracts.

## Chainlink Node

A [Docker Compose](https://docs.docker.com/compose/) project to launch an Arbol-Chainlink node on a new [AWS EC2](https://aws.amazon.com/ec2/) (Amazon Linux 2) instance. The project deploys containers for
a [Chainlink](https://github.com/smartcontractkit/chainlink) node for fulfilling smart contract oracle requests, an [IPFS](https://github.com/ipfs/go-ipfs) daemon for retrieving Arbol weather data and listening to IPFS-HTTP requests, and a [Gunicorn](https://gunicorn.org/)/[Flask](https://flask.palletsprojects.com/en/2.0.x/) server running a Chainlink external adapter for serving requests using the [dClimate Python Client](https://github.com/dClimate/dWeather-Python-Client) and computing payout evaluations on retrieved data.

To launch a new node with new or imported credentials and contract data, run the following:

```
sudo yum install -y git
git clone --recurse-submodules https://github.com/Arbol-Project/Arbol-dApp.git
bash Arbol-dApp/chainlink_node/scripts/setup-AWS.sh
exit

# forward credentials from Arbol-dApp repo on local machine
bash chainlink_node/scripts/send-secrets.sh

# log back in and set sensitive data
bash Arbol-dApp/chainlink_node/scripts/receive-secrets.sh
cd Arbol-dApp/chainlink_node
docker compose up --build
```

The Chainlink Node GUI can be accessed at `https://localhost:6689`; if SSH tunneling into EC2 instance on a VPC add `-L 6689:localhost:6689` to forward to your local machine.

The IPFS web UI can be accessed at `http://localhost:5001/webui`; if SSH tunneling into EC2 instance on a VPC add `-L 5001:localhost:5001` to forward to your local machine.

## Smart Contracts

This directory holds smart contract source for [Arbol](https://www.arbolmarket.com/) derivative deals, [Hardhat](https://hardhat.org/) testing, deployment, verification, and evaluation scripts, Chainlink oracle job definitions, and contract deployment records.

To test, deploy, verify, and evaluate smart contracts located in `smart_contracts/hardhat/contracts`, first make sure Hardhat
is installed locally, then run the following:

```
# from Arbol-dApp
cd smart_contracts/hardhat
npx hardhat test                                # run tests on Blizzard contract (Contract should be set for Kovan network)
npx hardhat run scripts/deploy-blizzard.js      # deploy contracts
npx hardhat run scripts/verify-deployments.js   # verify source codes for all deployed contracts
npx hardhat run scripts/evaluate-deployments.js # evaluate all deployed contracts with expired coverage periods
```

Deployment details can be viewed in `web_app/packages/contracts/src/logs`. Depending on the contract, evaluation may fail if certain conditions are not met (for example, for all contracts, LINK token provider must first approve derivativeProvider contract to move funds for oracle requests).
