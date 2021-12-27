import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
# import csv
import json
import pytest
from datetime import datetime

import adapter


SRO_DIR = os.path.join(os.path.dirname(__file__), 'SROs')
# PAYOUT_DIR = os.path.join(os.path.dirname(__file__), 'payouts')


def parse_contract_data(contract, i):
    if 'loaders' in contract['__config__']['payouts']['__config__']['index_distribution']['__config__']['index']['__config__']['loader']['__config__']:
        config = contract['__config__']
        name = config['id']
        payouts = config['payouts']['__config__']
        derivative = payouts['derivative']['__config__']
        opt_type = derivative['opt_type']
        index = payouts['index_distribution']['__config__']['index']['__config__']
        loader = index['loader']['__config__']
        dataset = loader['dataset_name']
        
        strike = str(derivative['strike'])
        tick = str(derivative['tick'])
        limit = str(derivative['limit'])

        start = str(int(datetime.strptime(index['start'], '%Y-%m-%d').timestamp()))
        end = str(int(datetime.strptime(index['end'], '%Y-%m-%d').timestamp()))
        
        locations = []
        for loader_config in loader['loaders']:
            pos = f"[{loader_config['__config__']['lat']}, {loader_config['__config__']['lon']}]"
            locations.append(pos)

        request_params = {
            'name': name,
            'strike': strike,
            'tick': tick,
            'exhaust': None,
            'limit': limit,
            'opt_type': opt_type,
            'start': start,
            'end': end,
            'dataset': dataset,
            'locations': locations,
        }
        request_data = {
            'id': f'{i}',
            'data': {
                'params': request_params
            }
        }
    else:
        request_params = {
            'name': "Dallas Mavs 2022-04-10 00:00:00",
            'dates': ["2021-10-06", "2021-10-08", "2021-10-26", "2021-10-28", "2021-10-31", "2021-11-02", "2021-11-06", "2021-11-08", "2021-11-15", "2021-11-27", "2021-11-29", "2021-12-03", "2021-12-04", "2021-12-07", "2021-12-13", "2021-12-15", "2021-12-21", "2021-12-23", "2022-01-03", "2022-01-05", "2022-01-09", "2022-01-15", "2022-01-17", "2022-01-19", "2022-01-20", "2022-01-23", "2022-01-29", "2022-02-02", "2022-02-04", "2022-02-06", "2022-02-08", "2022-02-10", "2022-02-12", "2022-03-03", "2022-03-05", "2022-03-07", "2022-03-09", "2022-03-21", "2022-03-23", "2022-03-27", "2022-03-29", "2022-04-08", "2022-04-10"],
            'station_id': 'USW00003927',
            'weather_variable': "SNOW",
            'dataset': 'ghcnd',
            'opt_type': "CALL",
            'strike': "0",
            'exhaust': None,
            'limit': "250000",
            'threshold': "6",
        }
        request_data = {
            'id': f'{i}',
            'data': {
                'params': request_params
            }
        }
    return request_data


def parse_available_contract_data():
    ''' Read contract data from json file and format requests
        for testing adapter

        Parameters: sropath (str), path to the json file holding
        the contract data
                    paypath (str), path to the csv file holding the
        final calculated payouts
        Returns: list, formatted adapter requests for each set of contracts
        whose contract periods are ended
    '''
    contract_requests = []
    i = 1
    for filename in os.listdir(SRO_DIR):
        if '.json' in filename:
            sropath = os.path.join(SRO_DIR, filename)
            with open(sropath) as f:
                data = json.load(f)
                f.close()
            if 'contracts' in data['__config__']:
                for contract in data['__config__']['contracts']:
                    request_data = parse_contract_data(contract, i)
                    contract_requests.append(request_data)
                    i += 1
            else:
                request_data = parse_contract_data(data, i)
                contract_requests.append(request_data)
                i += 1
    return contract_requests

TEST_DATA = parse_available_contract_data()

def adapter_setup(test_data):
    ''' Runs the adapter for a single test request

        Parameters: test_data (dict), the request to test
        Returns: dict, the result data of the adapter request
    '''
    a = adapter.Adapter(test_data)
    return a.result

@pytest.mark.parametrize('test_data', TEST_DATA)
def test_create_request_success(test_data):
    ''' Tests the adapter against all contracts in the rainfall basket

        Parameters: test_data (dict), the request to test
    '''
    result = adapter_setup(test_data)
    name = test_data['data']['params']['name']
    assert result['statusCode'] == 200
    assert result['data'] is not None
    assert type(result['result']) is int
    assert type(result['data']['result']) is int
    assert result['result'] == round(float(payout), 2)
    msg = f'name: {name}, result payout: {result["result"]} (x100)\n'
    print(msg)

if __name__ == '__main__':
    _ = [test_create_request_success(test) for test in TEST_DATA]
