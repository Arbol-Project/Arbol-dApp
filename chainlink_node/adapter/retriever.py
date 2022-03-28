import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dweather'))

from program_catalog.tools.wrapper import parse_request, get_request_data, operate_on_data


class Retriever:
    ''' External Adapter class for retrieving dClimate weather data on IPFS,
        performing chained operations, and returning the result on chain 
    '''

    def __init__(self, data):
        ''' Each call to the adapter creates a new Adapter
            instance to handle the request

            Parameters: input (dict), the received request body
        '''
        self.id = data.get('id', '2')
        self.request_data = data.get('data')
        self.validate_request_data()
        if self.valid:
            self.execute_request()
        else:
            self.result_error()

    def validate_request_data(self):
        ''' Validate that the received request is properly formatted and includes
            all necessary paramters. In the case of an illegal request error
            information is logged to the output
        '''
        if self.request_data is None or self.request_data == {}:
            self.request_error = 'request data empty'
            self.valid = False
        else:
            request_url = self.request_data.get('request_url', None)
            if request_url is None:
                self.request_error = 'request_url missing'
                self.valid =  False
            else:
                try:
                    result, valid = parse_request(request_url)
                    if not valid:
                        self.request_error = result
                        self.valid = False
                    else:
                        self.request_args = result
                        self.request_operations = self.request_data.get('request_ops', None)
                        self.request_parameters = self.request_data.get('request_params', [])
                        self.valid = True
                except Exception as e:
                    self.valid = False
                    self.request_error = e.__name__

    def execute_request(self):
        ''' Get the designated program and determine whether the associated
            contract should payout and if so then for how much
        '''
        try:
            result = get_request_data(self.request_args)
            if self.request_operations is not None:
                result['data'], msg = operate_on_data(result['data'], self.request_operations, self.request_parameters)
                if msg is not None:
                    self.request_error = msg
                    self.result_error()
            else:
                if type(result.get('data', None)) is not int:
                    self.request_error = 'request operations missing'
            # currently only supporting return values and units, not metadata, snapped cooordinates, etc
            # also first just one return value at a time (along with unit)
            # unit is now a failure message if fail, adapter no longer returns 500 response on fail
            payload = {'unit': result.get('unit', 'no unit'), 'data': result['data']}
            self.result_success(payload)
        except Exception as e:
            self.request_error = e.__name__
            self.result_error()

    def result_success(self, result):
        ''' If the request reaches no errors log the outcome in the result field
            including the payout in the response

            Parameters: result (float), the determined payout value
        '''
        self.result = {
            'jobRunID': self.id,
            # 'data': self.request_data,
            'result': result,
            'statusCode': 200,
        }

    def result_error(self):
        ''' If the request terminates in an error then log the error details in
            the result field to be returned in the response

            Parameters: error (str), associated error message
        '''
        # self.result = {
        #     'jobRunID': self.id,
        #     'data': self.request_data,
        #     'error': f'There was an error: {error}',
        #     'statusCode': 500,
        # }
        self.result = {
            'jobRunID': self.id,
            'result': {'unit': self.request_error, 'data': 0},
            'statusCode': 200,
        }