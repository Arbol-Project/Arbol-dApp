import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import csv
import json
import pytest
from datetime import datetime

import adapter

SRO_PATH = './tests/rainfall_basket_sro.json'
PAYOUT_PATH = './tests/payouts.csv'

def parse_available_contract_data(sropath, paypath):
    ''' Read contract data from json file and format requests
        for testing adapter

        Parameters: sropath (str), path to the json file holding
        the contract data
                    paypath (str), path to the csv file holding the
        final calculated payouts
        Returns: list, formatted adapter requests for each set of contracts
        whose contract periods are ended
    '''
    if os.path.isfile('./tests/log.txt'):
        os.remove('./tests/log.txt')
    contracts = {}
    with open(paypath) as f:
        data = csv.reader(f, delimiter=',')
        for row in data:
            name = row[0]
            payout = row[1]
            if payout == 'DATA UNAVAILABLE':
                payout = None
            else:
                payout = int(round(float(payout), 2) * 100)
            contracts[name] = payout
        f.close()
    with open(sropath) as f:
        data = json.load(f)
        f.close()
    contract_requests = []
    for contract in data['__config__']['contracts']:
        config = contract['__config__']
        name = config['id']
        payouts = config['payouts']['__config__']
        derivative = payouts['derivative']['__config__']
        opt_type = derivative['opt_type']
        index = payouts['index_distribution']['__config__']['index']['__config__']
        loader = index['loader']['__config__']
        dataset = loader['dataset_name']
        payout = contracts[name]
        
        strike = int(derivative['strike'] * 100)
        exhaust = int(derivative['exhaust'] * 100)
        limit = int(derivative['limit'] * 100)

        start = int(datetime.strptime(index['start'], '%Y-%m-%d').timestamp())
        end = int(datetime.strptime(index['end'], '%Y-%m-%d').timestamp())
        
        locations = []
        for loader_config in loader['loaders']:
            lat = loader_config['__config__']['lat']
            lon = loader_config['__config__']['lon']
            locations.append(str([lat, lon]))
        
        request_params = {
            'name': name,
            'strike': strike,
            'exhaust': exhaust,
            'limit': limit,
            'opt_type': opt_type,
            'start': start,
            'end': end,
            'dataset': dataset,
            'locations': locations,
        }
        request_data = {
            'id': '1',
            'data': {
                'payout': payout,
                'program': 'GRP' if opt_type == 'PUT' else 'XSR',
                'params': request_params
            }
        }
        contract_requests.append(request_data)
    return contract_requests

TEST_DATA = parse_available_contract_data(SRO_PATH, PAYOUT_PATH)

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
    payout = test_data['data']['payout']
    assert result['statusCode'] == 200
    assert result['jobRunID'] == '1'
    assert result['data'] is not None
    assert type(result['result']) is int
    assert type(result['data']['result']) is int
    if payout is not None:
        assert result['result'] == round(float(payout), 2)
        msg = f'name: {name}, result payout: {result["result"]} (x100), official payout: {payout} (x100)\n'
        f = open('./tests/log.txt', 'a')
        f.write(msg)
        f.close()
        print(msg)
    else:
        msg = f'name: {name}, request status: success\n'
        f = open('./tests/log.txt', 'a')
        f.write(msg)
        f.close()
        print(msg)

if __name__ == '__main__':
    _ = [test_create_request_success(test) for test in TEST_DATA]
