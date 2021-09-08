import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dClimate/dweather_python_client'))

from program_catalog_stub.fake_program_catalog.programs.directory import get_program

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
        task_name = self.request_data.get('task')
        params = self.request_data.get('params')
        try:
            # get class pointer from program file in catalog
            program = get_program(program_name)
            task = getattr(program, task_name)
            self.result = task(**params)
            self.result_success(program_name, task_name)
        except Exception as e:
            self.result_error(e)

    def result_success(self, program, task):
        self.result = {
            'jobRunID': self.id,
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
