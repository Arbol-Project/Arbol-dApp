import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dweather'))

from program_catalog.tools.wrapper import parse_request, handle_request


class API:
    ''' External Adapter class that implements retrieval of dClimate weather data on IPFS '''

    def __init__(self, data):
        ''' Each call to the adapter creates a new Adapter
            instance to handle the request

            Parameters: input (dict), the received request body
        '''
        self.id = data.get('id', '2')
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
        request_url = self.request_data.get('request_url', None)
        if request_url is None:
            self.request_error = 'no request url specified'
            return False
        result, valid = parse_request(request_url)
        if valid:
            self.request_args = result
            return True
        else:
            self.request_error = result
            return False

    def execute_request(self):
        ''' Get the designated program and determine whether the associated
            contract should payout and if so then for how much
        '''
        try:
            data = handle_request(self.request_args)
            self.result_success(data)
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
