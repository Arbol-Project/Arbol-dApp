import program_catalog_stub.fake_program_catalog.programs as catalog

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
            program = getattr(catalog, [program_name]).get_program()
            task = getattr(program, task_name)
            self.result = task(**params)
            self.result_success(program_name, task_name)
        except Exception as e:
            self.result_error(e)

    def result_success(self, data, program, task):
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

# example data format for serve_contract request
# {
#     "id": 0,
#     "data":
#     {
#         "program": "cambodia_rainfall",                   #this is a file name
#         "task": "serve_contract",                         #this is a method name
#         "params":
#         {
#             "dataset": "chirpsc_final_05-daily",
#             "lat": 100.0,
#             "lon": -95.0,
#             "optional_params":                            #optional parameters for getting data from IPFS
#             {
#                 "also_return_snapped_coordinates": True
#             },
#             "task_params":                                #additional serve_contract parameters
#             {
#                 "start": "2021-08-01",
#                 "end": "2021-08-31",
#                 "strike": 0.5,
#                 "exhaust": 0.25,
#                 "limit": 1000,
#                 "option_type": "PUT"
#             }
#         }
#     }
# }
# curl -X POST -H "content-type:application/json" "http://0.0.0.0:8080/" --data '{ "id": 0, "data": {"program": "cambodia_rainfall", "task": "serve_contract", "params": {"dataset": "chirpsc_final_05-daily", "lat": 100.0, "lon": -95.0, "optional_params": {"also_return_snapped_coordinates": True}, "task_params": {"start": "2021-08-01", "end": "2021-08-31", "strike": 0.5, "exhaust": 0.25, "limit": 1000, "option_type": "PUT"} } } }'
