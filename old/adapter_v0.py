# Shallow adapter over dWeather APIv3 endpoint
import os

from bridge import Bridge
from tools import PARAM_SETTERS

AUTH_TOKEN = os.environ['AUTH_TOKEN']

class Adapter:
    def __init__(self, input):
        self.base_url = 'https://api.dclimate.net/apiv3'
        self.params = {}
        self.headers = {'Authorization': AUTH_TOKEN, 'accept': 'application/json'}
        self.id = input.get('id', '1')
        self.request_data = input.get('data')
        if self.validate_request_data():
            self.bridge = Bridge()
            self.set_params()
            self.create_request()
        else:
            self.result_error('No data provided')

    def validate_request_data(self):
        if self.request_data is None:
            return False
        if self.request_data == {}:
            return False
        return True

    def set_params(self):
        job_type = self.request_data.get('job_type')
        param_setter = PARAM_SETTERS[job_type]
        endpoint, params = param_setter(self.request_data, job_type)
        self.base_url = os.path.join(self.base_url, endpoint)
        self.params = params

    def create_request(self):
        try:
            response = self.bridge.request(self.base_url, params=self.params, headers=self.headers)
            data = response.json()
            self.result = data
            self.result_success(data)
        except Exception as e:
            self.result_error(e)
        finally:
            self.bridge.close()

    def result_success(self, data):
        self.result = {
            'jobRunID': self.id,
            'data': data,
            'result': self.result,
            'statusCode': 200,
        }

    def result_error(self, error):
        self.result = {
            'jobRunID': self.id,
            'status': 'errored',
            'error': f'There was an error: {error}',
            'statusCode': 500,
        }

#pipenv install
#pipenv run python app.py
#curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 0, "data": {"job_type": "Dataset Information", "dataset": "cpcc_precip_us-daily"} }'
#curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 0, "data": {"job_type": "Grid File Dataset History", "dataset": "cpcc_precip_us-daily", "lat": 40, "lon": -100} }'
