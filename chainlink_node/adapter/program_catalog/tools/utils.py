import os
import hashlib
import json
import requests
from pymongo import MongoClient

RISK_API_ENDPOINT = 'https://temporary.placeholder'


def verify_request(uri):
    half = len(uri) // 2 
    hash = uri[:half]
    id = uri[half:]
    client = MongoClient(os.getenv('MONGO_PROD_CONNECTION_STRING'))
    contracts_collection = client['meteor']['contracts']
    cursor = contracts_collection.find_one({"_id": id, "lifecycleStatus": "Awaiting Evaluation", "serializedRiskObject": {"$exists": "true", "$ne": "null"}}, {'_id': 1, 'serializedRiskObject': 1, 'lifecycleStatus': 1})
    sro = json.dumps(cursor['serializedRiskObject'], sort_keys=True)
    sro_hash = hashlib.md5(sro.encode("utf-8"))
    if hash != sro_hash.hexdigest():
        return 'hash does not match', False
    result = {'sro': sro, 'id': id}
    return result, True

def get_request_payout(sro):
    sro_data = json.loads(sro)
    payout = requests.post(url=RISK_API_ENDPOINT, data=sro_data)
    result = int(float(payout) * 1e18)
    return result