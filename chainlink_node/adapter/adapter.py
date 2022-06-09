import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dweather'))

from program_catalog.directory import parse_and_validate


class ArbolAdapter:
    ''' External Adapter class for computing payout evaluations for
        Arbol weather contracts using dClimate weather data on IPFS
        and verified contract terms
    '''

    def __init__(self, data):
        ''' Each call to the adapter creates a new Adapter
            instance to handle the request

            Parameters: data (dict), the received request body
        '''
        self.id = data.get('id', '3')
        self.request_data = data.get('data')
        if self.validate_request_data():
            self.execute_request()
        else:
            self.result_error(self.request_error)

    def validate_request_data(self):
        ''' Validate that the received request is properly formatted and includes
            all necessary paramters. In the case of an illegal request error
            information is logged to the output
        '''
        try:
            if self.request_data is None or self.request_data == {}:
                self.request_error = 'request data empty'
                return False
            self.parameters, self.program = parse_and_validate(self.request_data)
            if self.program is None:
                self.request_error = self.parameters
                return False
            else:
                return True
        except Exception as e:
            self.result_error(e)

    def execute_request(self):
        ''' Get the designated program and determine whether the associated
            contract should payout and if so then for how much
        '''
        try:
            result = self.program.serve_request(self.parameters)
            self.result_success(result)
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
