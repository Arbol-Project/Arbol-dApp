import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dweather'))

from program_catalog.directory import get_program


class Adapter:
    ''' External Adapter class that implements the evaluation and conditional
        executione of Arbol weather contracts based on weather data on IPFS
    '''
    def __init__(self, data):
        ''' Each call to the adapter creates a new Adapter
            instance to handle the request

            Parameters: data (dict), the received request body
        '''
        self.id = data.get('id', '1')
        self.request_data = data.get('data')
        if self.validate_request_data():
            self.execute_request()
        else:
            self.result_error(f'Bad Request: {self.request_error}')

    def validate_request_data(self):
        ''' Validate that the received request is properly formatted and includes
            all necessary paramters. In the case of an illegal request error
            information is logged to the output

            Returns: bool, whether the request is valid
        '''
        if self.request_data is None or self.request_data == {}:
            self.request_error = 'request is empty'
            return False
        parameters = self.request_data.get('params', None)
        if parameters is None:
            self.request_error = 'no parameters specified'
            return False
        # see utils/preload_adapter.py for example parameters format
        self.parameters = {parameters[i]:parameters[i+1] for i in range(0, len(parameters), 2)}
        self.program = get_program(self.parameters)
        if self.program is None:
            self.request_error = 'invalid program specified'
            return False
        valid, self.request_error = self.program.validate_request(self.parameters)
        return valid

    def execute_request(self):
        ''' Get the designated program and determine whether the associated
            contract should payout and if so then for how much
        '''
        try:
            payout = self.program.serve_evaluation(self.parameters)
            self.request_data['result'] = payout
            self.result_success(payout)
        except Exception as e:
            self.result_error(e)

    def result_success(self, result):
        ''' If the request reaches no errors log the outcome in the result field
            including the payout in the response

            Parameters: result (float), the determined payout value
        '''
        self.result = {
            'jobRunID': self.id,
            'data': self.request_data,
            'result': result,
            'statusCode': 200,
        }

    def result_error(self, error):
        ''' If the request terminates in an error then log the error details in
            the result field to be returned in the response

            Parameters: error (str), associated error message
        '''
        self.result = {
            'jobRunID': self.id,
            'data': self.request_data,
            'error': f'There was an error: {error}',
            'statusCode': 500,
        }
