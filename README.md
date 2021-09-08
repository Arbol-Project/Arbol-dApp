# dClimate-CL-EA
Chainlink External Adapter for dClimate data retrieval and smart contract evaluation.
To test the adapter locally, clone the repo and install the dependencies:
```
git clone https://github.com/dmp267/dClimate-CL-EA.git
cd dClimate-CL-EA
pipenv install
```
Then run the adapter and send a CURL request to the local endpoint:
```
pipenv run python3 app.py
curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 1, "data": { "program": "cambodia_rainfall", "task": "serve_evaluation", "params": { "these dont do anything": 0, "these dont do anything_": 1, "these dont do anything__": 2 } } }'
```
Example structure for a ```serve_contract``` request:
```
example data format for serve_contract request
{
    "id": 0,
    "data":
    {
        "program": "cambodia_rainfall",                   #this is a file name
        "task": "serve_contract",                         #this is a method name
        "params":
        {
            "dataset": "chirpsc_final_05-daily",
            "lat": 100.0,
            "lon": -95.0,
            "optional_params":                            #optional parameters for getting data from IPFS
            {
                "also_return_snapped_coordinates": True
            },
            "task_params":                                #additional serve_contract parameters
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
