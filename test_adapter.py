import json
import pytest

import adapter


# Set path to sro.json file here
SROFILEPATH = './rainfall_basket_sro.json'

def parse_contract_data(filepath):
    ''' Read contract data from json file and format requests
        for testing adapter

        Parameters: filepath (str), path to the json file holding
        the contract data
        Returns: list, formatted adapter requests for each set of contracts
    '''
    with open(filepath) as f:
        data = json.load(f)
        f.close()
    contract_requests = []
    for contract in data['__config__']['contracts']:
        config = contract['__config__']
        payouts = config['payouts']['__config__']
        derivative = payouts['derivative']['__config__']
        index = payouts['index_distribution']['__config__']['index']['__config__']
        loader = index['loader']['__config__']
        strike = derivative['strike']
        exhaust = derivative['exhaust']
        limit = derivative['limit']
        opt_type = derivative['opt_type']
        start = index['start']
        end = index['end']
        dataset = loader['dataset_name']
        locations = []
        for loader_config in loader['loaders']:
            lat = loader_config['__config__']['lat']
            lon = loader_config['__config__']['lon']
            locations.append([lat, lon])
        request_params = {
            'strike': strike,
            'exhaust': exhaust if exhaust is not None else 0.0,
            'limit': limit,
            'opt_type': opt_type,
            'start': start,
            'end': end,
            'dataset': dataset,
            'locations': locations
        }
        request_data = {
            'id': '1',
            'data': {
                'program': 'cambodia_rainfall',
                'params': request_params
            }
        }
        contract_requests.append(request_data)
    return contract_requests

def adapter_setup(test_data):
    ''' Runs the adapter for a single test request

        Parameters: test_data (dict), the request to test
        Returns: dict, the result data of the adapter request
    '''
    a = adapter.Adapter(test_data)
    return a.result

@pytest.mark.parametrize('test_data', parse_contract_data(SROFILEPATH))
def test_create_request_success(test_data):
    ''' Tests the adapter against all contracts in the rainfall basket

        Parameters: test_data (dict), the request to test
    '''
    print(test_data)
    result = adapter_setup(test_data)
    print(result)
    assert result['statusCode'] == 200
    assert result['jobRunID'] == '1'
    assert result['data'] is not None
    assert type(result['result']) is float
    assert type(result['data']['result']) is float

# if __name__ == '__main__':
#     tests = parse_contract_data('./rainfall_basket_sro.json')
#     for test in tests:
#         test_create_request_success(test)

# @pytest.mark.parametrize('test_data', [])
# def test_create_request_error(test_data):
#     ''' Runs the adapter for a single test request
#
#         Parameters: test_data (dict), the request to test
#         Returns: dict, the result data of the adapter request
#     '''
#     result = adapter_setup(test_data)
#     print(result)
#     assert result['statusCode'] == 500
#     assert result['jobRunID'] == '1'
#     assert result['error'] is not None
