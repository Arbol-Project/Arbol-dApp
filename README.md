# Arbol-dApp

This repository contains all components of Arbol dApp.

# Chainlink Node

A Docker Compose project to launch an Arbol-Chainlink node on a new AWS EC2 instance. The project launches containers for
a Chainlink node for fulfilling smart contract oracle requests, an IPFS daemon for retrieving Arbol weather data, and a Chainlink external adapter run as a Guicorn server for computing payout evaluations on retrieved data.

To jointly deploy a Chainlink node, external adapter server, and IPFS daemon in a fresh Amazon Linux 2 instance, ssh in and install git, then clone this repo, run the setup script, and either import existing Chainlink credentials or set new ones. Finally logout and log back into the instance to refresh docker permissions and run docker compose:

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
