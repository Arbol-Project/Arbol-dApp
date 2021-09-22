# Arbol-CL-EA
Chainlink External Adapter for dClimate data retrieval and Arbol contract evaluation.

To test the adapter locally, first make sure you have Go-IPFS version 0.7.0 installed: https://github.com/ipfs/go-ipfs/releases/tag/v0.7.0.

Then clone this repo and install the dependencies:
```
git clone --recurse-submodules --remote-submodules https://github.com/dmp267/dClimate-CL-EA.git
cd dClimate-CL-EA
pipenv install
```
Next configure Go-IPFS and launcht the daemon:
```
ipfs bootstrap rm --all
ipfs bootstrap add  "/ip4/198.211.104.50/tcp/4001/p2p/QmWsAFSDajELyneR7LkMsgfaRk2ib1y3SEU7nQuXSNPsQV"
ipfs daemon
```
The run the adapter and send a CURL request to the local endpoint:
```
# in a second terminal
pipenv run python3 app.py
# in a third terminal
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8000/" --data '{ "id": 1, "data": { "program": "cambodia_rainfall", "endpoint": "serve_evaluation", "params": { "these dont do anything": 0, "these dont do anything_": 1, "these dont do anything__": 2 } } }'
```
Example structure for a ```serve_contract``` request:
```
{
    "id": 0,
    "data":
    {
        "program": "cambodia_rainfall",                       #this is a file name
        "endpoint": "serve_contract",                         #this is a method name
        "params":
        {
            "dataset": cpcc_precip_global-daily",
            "locations": [[41.175, -75.125], [41.350, -75.250]],
            "contract_params":                                #additional serve_contract parameters
            {
                "start": "2021-08-01",
                "end": "2021-08-31",
                "strike": 0.5,
                "exhaust": 0.25,
                "limit": 1000,
                "option_type": "PUT"
            }
        }
    }
}
```
CURL request for the above example (these will be moved into tests eventually)
```
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8000/" --data '{ "id": 0, "data": { "program": "cambodia_rainfall", "endpoint": "serve_contract", "params": { "dataset": "cpcc_precip_global-daily", "locations": [[41.175, -75.125], [41.350, -75.250]], "contract_params": { "start": "2021-08-01", "end": "2021-08-31", "strike": 0.5, "exhaust": 0.25, "limit": 1000, "option_type": "PUT" } } } }' } } }'


```
