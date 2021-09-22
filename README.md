# Arbol-CL-EA
Chainlink External Adapter for dClimate data retrieval and smart contract evaluation.

To test the adapter locally, clone this repo and install the dependencies:
```
git clone --recurse-submodules --remote-submodules https://github.com/dmp267/dClimate-CL-EA.git
cd dClimate-CL-EA
pipenv install
```
Build dweather_python_client as per: https://github.com/dClimate/dWeather-Python-Client.
Then run the adapter and send a CURL request to the local endpoint:
```
pipenv run python3 app.py
# in another terminal
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 1, "data": { "program": "cambodia_rainfall", "endpoint": "serve_evaluation", "params": { "these dont do anything": 0, "these dont do anything_": 1, "these dont do anything__": 2 } } }'
```
Example structure for a ```serve_contract``` request:
```
{
    "id": 0,
    "data":
    {
        "program": "cambodia_rainfall",                   #this is a file name
        "endpoint": "serve_contract",                         #this is a method name
        "params":
        {
            "dataset": "chirpsc_final_05-daily",
            "locations": [(100, -95.0), (101, -95.0),],
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
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 0, "data": { "program": "cambodia_rainfall", "endpoint": "serve_contract", "params": { "dataset": "chirpsc_final_05-daily", "locations": [[100, -95.0], [101, -94.0]], "contract_params": { "start": "2021-08-01", "end": "2021-08-31", "strike": 0.5, "exhaust": 0.25, "limit": 1000, "option_type": "PUT" } } } }'
```
