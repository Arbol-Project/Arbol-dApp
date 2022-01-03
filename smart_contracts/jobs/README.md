# Chainlink Jobs

The following Chainlink Oracle jobs are provided:

- GetContractEvaluation: sends a payout evaluation request for an generalized Arbol Option contract
    - Inputs: "params", string array of all request parameters, with the string of the parameter name preceeding the assigned value (e.g. `params = ["id", "test", "dataset", "ghcnd", "strike", "6000", "start", "2021-09-04", ...]`)

- GetCambodiaEvaluation: sends a payout evaluation request for a Rainfall Option contract
    - Inputs: `dataset, opt_type, locations, start, end, strike, limit, tick/exhaust`
- GetCubanBlizzardEvaluation: sends a payout evaluation request for a Critical Snowfall Option contract
    - Inputs: `dataset, opt_type, dates, station_id, weather_variable, end, strike, limit, tick/exhaust, threshold`
