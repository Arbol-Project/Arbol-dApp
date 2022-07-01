import os
import json
import zlib
import base64
import ast

from web3 import Web3
from nacl.public import PrivateKey, PublicKey, Box

CONTRACTS = 'packages/react-app/src/contracts/hardhat_contracts.json'
SERIALIZATION_ORDER = 'packages/react-app/src/contracts/serialization_order.json'

NETWORK = os.environ['NETWORK_NAME'] if 'NETWORK_NAME' in os.environ else 'rinkeby'
WALLET = os.environ['PUBLIC_KEY']

CHAIN_MAP = {
    'rinkeby': '4',
    'polygon-mainnet': '137'
}
assert NETWORK in CHAIN_MAP, 'Network not supported'
CHAIN_ID = CHAIN_MAP[NETWORK]
INFURA_URL = 'https://' + NETWORK + '.infura.io/v3/' + os.environ['INFURA_ID']
PROVIDER_URL = os.environ['RPC_URL'] if 'RPC_URL' in os.environ else INFURA_URL


def int_to_bytes(x: int) -> bytes:
    return x.to_bytes((x.bit_length() + 7) // 8, 'big')


def int_from_bytes(xbytes: bytes) -> int:
    return int.from_bytes(xbytes, 'big')


def int_to_base64_str(x_int):
    x_bytes = int_to_bytes(x_int)
    x_str = base64.b64encode(x_bytes).decode()
    return x_str


def base64_str_to_int(x_str):
    x_bytes = base64.b64decode(x_str)
    x_int = int_from_bytes(x_bytes)
    return x_int


def get_contract_uris(wallet=WALLET):
    with open(CONTRACTS) as f:
        contract_json = json.load(f)
        f.close()
    address = contract_json[CHAIN_ID][NETWORK]['contracts']['WeatherRiskNFT']['address']
    abi = contract_json[CHAIN_ID][NETWORK]['contracts']['WeatherRiskNFT']['abi']

    w3 = Web3(Web3.HTTPProvider(PROVIDER_URL))
    nft_contract = w3.eth.contract(address=address, abi=abi)

    token_ids = nft_contract.functions.tokenIDs().call({'from': wallet})
    token_data = {}
    for t_id in token_ids:
        t_uri = nft_contract.functions.tokenURI(t_id).call({'from': wallet})
        token_data[int_to_base64_str(t_id)[:-3]] = t_uri

    return token_data


def decrypt(uri, key):
    bytes_data = base64.b64decode(uri)
    encrypted_bytes = zlib.decompress(bytes_data)
    encrypted_data = encrypted_bytes.decode()
    encrypted_payload = ast.literal_eval(encrypted_data)

    section_length = len(encrypted_payload) // 3
    selected_encryption_payload = encrypted_payload[:section_length]

    nonce = base64.b64decode(selected_encryption_payload[0])
    ephemeral_public_key = base64.b64decode(selected_encryption_payload[1])
    cipher_text = base64.b64decode(selected_encryption_payload[2])

    secret_key_bytes = bytes.fromhex(key)

    secret_key = PrivateKey(secret_key_bytes)
    public_key = PublicKey(ephemeral_public_key)

    box = Box(secret_key, public_key)
    plaintext = box.decrypt(nonce + cipher_text).decode()
    data = json.loads(plaintext)
    return data


def build_output(data):
    with open(SERIALIZATION_ORDER) as f:
        serialization_order = json.load(f)
        f.close()
    report_order = serialization_order['reportOrder']
    terms_order = serialization_order['termsOrder']
    output = {}
    for i in range(len(report_order)):
        label = report_order[i]
        output[label] = data[i]
    for i in range(len(terms_order)):
        label = terms_order[i]
        output[label] = data[len(report_order) + 2 * i + 1]
    return output
    

if __name__ == '__main__':
    token_data = get_contract_uris()

    s_key = os.environ['PRIVATE_KEY']
    decryptions = {}
    for t_id in token_data:
        t_uri = token_data[t_id]
        data = decrypt(t_uri, s_key)
        parsed = build_output(data)
        decryptions[t_id] = parsed

    with open('exports.json', 'w+') as f:
        json.dump(decryptions, f)
        f.close()