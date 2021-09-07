#Adapter that clones dClimate client functionality for cambodia rainfall contract interfacing
import program_catalog_stub.fake_program_catalog.programs.cambodia_rainfall as catalog

class Adapter:

    def __init__(self, input):
        self.id = input.get('id', '1')
        self.request_data = input.get('data')
        if self.validate_request_data():
            self.execute_request()
        else:
            self.result_error('No data provided')

    def validate_request_data(self):
        if self.request_data is None:
            return False
        if self.request_data == {}:
            return False
        return True

    def execute_request(self):
        program_name = self.request_data.get('program')
        program = getattr(catalog, [program_name])
        task_name = self.request_data.get('task')
        task_method = getattr(program, task_name)
        loader = getattr(program, 'loader')
        task_params = self.request_data.get('task_params')
        loader_params = self.request_data.get('loader_params')
        try:
            data = loader(**loader_params)
            self.result = task_method(data, **task_params)
            self.result_success(data, program_name, task_name)
        except Exception as e:
            self.result_error(e)

    def result_success(self, data, program, task):
        self.result = {
            'jobRunID': self.id,
            'data': data,
            'program': program,
            'task': task,
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

#curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 0, "data": {"program": "CambodiaRainfall", "task": "serve_contract", loader_params": {"dataset": "prismc-precip-daily", "lat": 100.0, "lon": -95.0}, "task_params": {"start": "2021-08-01", "end": "2021-08-31", "strike": 0.5, "exhaust": 0.25, "limit": 1000, "option_type": "PUT"} } }'
