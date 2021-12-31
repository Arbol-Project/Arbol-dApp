# Arbol-dApp

[N.B. this readme is a little old]

Chainlink External Adapter for dClimate data retrieval and Arbol contract evaluation.

To test the adapter locally, first make sure you have Go-IPFS version 0.7.0 installed: https://github.com/ipfs/go-ipfs/releases/tag/v0.7.0, http://docs.ipfs.io.ipns.localhost:8080/install/command-line/#system-requirements.

Then configure IPFS and launch the daemon:

```
ipfs bootstrap rm --all
ipfs bootstrap add  "/ip4/198.211.104.50/tcp/4001/p2p/QmWsAFSDajELyneR7LkMsgfaRk2ib1y3SEU7nQuXSNPsQV"
ipfs daemon
```

# Local

Clone this repo and install the dependencies:

```
git clone --recurse-submodules --remote-submodules https://github.com/dmp267/Arbol-dApp.git
cd Arbol-dApp/adapter
pipenv install
```

Then run the adapter app and send a cURL request to the local endpoint:

```
# in a second terminal
pipenv run python3 app.py
# in a third terminal
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8000/" --data '{ "id": 0, "data": { "program": "cambodia_rainfall", "params": { "dataset": "cpcc_precip_global-daily", "locations": [[41.125, -75.125], [40.875, -75.500], [41.500, -74.875], [41.250, -75.625]], "start": "2021-08-01", "end": "2021-08-31", "strike": 0.5, "exhaust": 0.25, "limit": 1000, "opt_type": "PUT" } } }'
```

Structure for data of the request above:

```
{
    "id": 0,
    "data":
    {
        "program": "cambodia_rainfall",
        "params":
        {
            "dataset": "cpcc_precip_global-daily",
            "locations": [[41.125, -75.125], [40.875, -75.500], [41.500, -74.875], [41.250, -75.625]]
            "start": "2021-08-01",
            "end": "2021-08-31",
            "strike": 0.5,
            "exhaust": 0.25,
            "limit": 1000,
            "opt_type": "PUT"
        }
    }
}
```

# Test

You can test the adapter with an SRO file and an associated CSV of payouts. To do
so, set the `SROFILEPATH` and `PAYOUTFILEPATH` variables in
`utils/preload_adapter.py` and run:

```
pipenv run pytest
# or
pipenv run python3 utils/preload_adapter.py
```

This will test the adapter for any contracts in the SRO whose coverage periods are
ended and whose official payouts are already known. The data pulled from IPFS for
these contracts is logged in the tests folder.
