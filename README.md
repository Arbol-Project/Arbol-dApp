# Arbol-dApp
Chainlink External Adapter for dClimate data retrieval and Arbol contract evaluation.

To jointly deploy a Chainlink node, external adapter server, and IPFS daemon in a fresh Amazon Linux 2 instance, ssh in and install git, then clone this repo, run the setup script, and either import existing Chainlink credentials or set new ones. Finally logout and log back into the instance to refresh docker permissions and run docker compose:
```
sudo yum install -y git
git clone --recurse-submodules --remote-submodules https://github.com/dmp267/Arbol-dApp.git
cd Arbol-dApp
# set credentials and reload
docker compose up --build
```
