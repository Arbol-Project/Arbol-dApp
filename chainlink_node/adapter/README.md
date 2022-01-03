# Arbol-dApp

Chainlink External Adapter for dClimate data retrieval and Arbol contract evaluation.

To test the adapter locally, first make sure you have Go-IPFS version 0.7.0 installed: https://github.com/ipfs/go-ipfs/releases/tag/v0.7.0, http://docs.ipfs.io.ipns.localhost:8080/install/command-line/#system-requirements.

Then configure IPFS and launch the daemon:

```
ipfs bootstrap rm --all
ipfs bootstrap add  "/ip4/198.211.104.50/tcp/4001/p2p/QmWsAFSDajELyneR7LkMsgfaRk2ib1y3SEU7nQuXSNPsQV"
ipfs daemon
```

# Local

To run the app from source, clone this repo and install the dependencies:

```
git clone --recurse-submodules --remote-submodules https://github.com/dmp267/Arbol-dApp.git
cd Arbol-dApp/adapter
pipenv install
```

Then start the adapter app. It should now be listening on port `8000`, test with a cURL request:

```
# in a second terminal
pipenv run python3 app.py
# in a third terminal
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8000/" --data '{ "id": 0, "data": { "params": { "dataset": "cpcc_precip_global-daily", "locations": ["[41.125, -75.125]", "[40.875, -75.500]", "[41.500, -74.875]", "[41.250, -75.625]"], "start": "1627776000", "end": "1638230400", "strike": "0.5", "exhaust": "0.25", "limit": "1000", "opt_type": "PUT" } } }'
```

Structure for data of the request above:

```
{
    "id": 0,
    "data":
    {
        "params":
        {
            "dataset": "cpcc_precip_global-daily",
            "locations": ["[41.125, -75.125]", "[40.875, -75.500]", "[41.500, -74.875]", "[41.250, -75.625]"]
            "start": "1627776000",
            "end": "1638230400",
            "strike": "0.5",
            "exhaust": "0.25",
            "limit": "1000",
            "opt_type": "PUT"
        }
    }
}
```

When the Adapter server starts up, it loads the local IPFS node with relevant contract data by making requests for all contracts present in `smart_contracts/hardhat/SROs` whose coverage periods are expired, and which have not yet been evaluated (according to the deployment logs in `web_app/packages/contracts/src/logs`). You can run this action yourself with the following:

```
pipenv run python3 utils/preload_adapter.py
```
