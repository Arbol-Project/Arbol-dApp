from io import StringIO
import os
import json
import requests
from web3 import Web3
# from dotenv import load_dotenv
# load_dotenv()

from adapter.tests.test_adapter import TEST_DATA


ETHERSCAN_API_KEY = os.getenv('ETHERSCAN_API_KEY')

provider_abi = json.load(open(os.getenv('ABI_PATH')))
w3 = Web3(Web3.HTTPProvider(os.getenv('ETH_HTTP_URL')))
account = w3.eth.account.privateKeyToAccount(os.getenv('WALLET_PRIVATE_KEY'))
nonce = w3.eth.getTransactionCount(account.address)
from_block_number = w3.eth.blockNumber
provider_address = w3.toChecksumAddress(os.getenv('PROVIDER_ADDRESS'))
derivative_provider = w3.eth.contract(abi=provider_abi, address=provider_address)

def run_pipeline_test(test_data):

    # first deploy a new contract instance for the test
    payout = test_data['data']['payout']
    name = test_data['data']['params']['name']
    dataset = test_data['data']['params']['dataset']
    opt_type = test_data['data']['params']['opt_type']
    locations = test_data['data']['params']['locations']
    start = test_data['data']['params']['start']
    end = test_data['data']['params']['end']
    strike = test_data['data']['params']['strike']
    limit = test_data['data']['params']['limit']
    exhaust = test_data['data']['params']['exhaust']

    new_contract = derivative_provider.functions.newContract(name, dataset, opt_type, locations, start, end, strike, limit, exhaust)
    tx = new_contract.buildTransaction({'from': account.address, 'nonce': nonce})
    signed_tx = account.signTransaction(tx)

    tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
    print(f'tx_hash={tx_hash} waiting for receipt..')

    tx_receipt = w3.eth.waitForTransactionReceipt(tx_hash, timeout=120)
    print(f'Receipt accepted. gasUsed={tx_receipt["gasUsed"]} blockNumber={tx_receipt["blockNumber"]}')

    # # then verify the contract source code on etherscan so that the abi can be retrieved programmatically
    # url = 'https://api-kovan.etherscan.io/api?module=contract&action=verifysourcecode'


    # next get the abi for the deployed contract and request a payout
    contract_created = derivative_provider.events.contractCreated().processReceipt(tx_receipt)
    contract_address = contract_created[0]['args']['_contract']
    etherscan_abi_endpoint = f'https://api-kovan.etherscan.io/api?module=contract&action=getabi&address={contract_address}&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url=etherscan_abi_endpoint).json()

    contract_abi = response['data']['result']
    options_contract = w3.eth.contract(abi=contract_abi, address=contract_address)

    request_payout_evaluation = derivative_provider.functions.requestPayoutEvaluation()
    tx = request_payout_evaluation.buildTransaction({'from': account.address, 'nonce': nonce})
    signed_tx = account.signTransaction(tx)

    tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
    print(f'tx_hash={tx_hash} waiting for receipt..')

    tx_receipt = w3.eth.waitForTransactionReceipt(tx_hash, timeout=120)
    print(f'Receipt accepted. gasUsed={tx_receipt["gasUsed"]} blockNumber={tx_receipt["blockNumber"]}')

    # finally check the posted result against the known payout
    result = derivative_provider.functions.getPayout().call()
    assert result == payout


if __name__ == '__main__':
    _ = [run_pipeline_test(test) for test in TEST_DATA]
