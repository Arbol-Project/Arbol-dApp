import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'dweather'))

from program_catalog.tools.utils import verify_request, get_contract_payout


class Evaluator:
    ''' External Adapter class that for computing payout evaluations for
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
        self.validate_request_data()
        if self.valid:
            self.execute_request()
        else:
            self.result_error()

    def validate_request_data(self):
        ''' Validate that the received request is properly formatted and includes
            all necessary paramters. In the case of an illegal request error
            information is logged to the output

            Returns: bool, whether the request is valid
        '''
        if self.request_data is None or self.request_data == {}:
            self.request_error = 'request data empty'
            self.valid = False
        else:
            request_uri = self.request_data.get('uri', None)
            if request_uri is None:
                self.request_error = 'token URI missing'
                self.valid =  False
            else:
                try:
                    result, valid = verify_request(request_uri)
                    if not valid:
                        self.request_error = result
                        self.valid = False
                    else:
                        self.request_args = result
                        self.valid = True
                except Exception as e:
                    self.valid = False
                    self.request_error = e.__name__

    def execute_request(self):
        ''' Get the designated program and determine whether the associated
            contract should payout and if so then for how much
        '''
        try:
            payout = get_contract_payout(self.request_args)
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
