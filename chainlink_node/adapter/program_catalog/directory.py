from program_catalog.programs.rainfall_derivative import RainfallDerivative
from program_catalog.programs.critical_snowfall_derivative import CriticalSnowfallDerivative
from program_catalog.tools.crypto import Reencryption, decrypt
from program_catalog.tools.loaders import parse_timestamp


def get_parameters_and_program(request_data):
    ''' Parses decrypted data and maps named contract terms to 
        associated their values

        Parameters: request_data (string), full request data
        Returns: dict, mapping of named terms from given data
    '''
    request_uri = request_data.get('uri', None)
    if request_uri is None:
        return 'token URI missing', None
    try:
        data = decrypt(request_uri)
    except Exception as e:
        return f'could not decode: {e}', None
    job_type = request_data.get('jobType', None)
    if job_type is None:
        return 'job type (reencryption, evaluation) missing', None
    elif job_type == "reencryption":
        program = Reencryption
        parameters = {
            "uri": request_data["uri"], 
            "unencrypted_data": data, 
            "public_key": request_data.get("pubKey", None)
        }
    else:
        first_pos = data.index('start')
        program_name = data[first_pos-1]
        param_list = data[first_pos:]
        parameters = {param_list[i]: param_list[i+1] for i in range(0, len(param_list), 2)}
        request_end_date = request_data.get('endDate', None)
        if request_end_date is None:
            return 'request end date is missing', None
        
        parameters['end'] = parse_timestamp(request_end_date)
        if 'GRP' in program_name or 'XSR' in program_name:
            program = RainfallDerivative
        else:
            program = CriticalSnowfallDerivative
    return parameters, program


def parse_and_validate(request_data):
    ''' Parses top-level request parameters, decrypts URI,
        gets associated program, and validates program parameters

        Parameters: params (dict), parameters for adapter request
        Returns: dict (or string), parsed program parameters. If parsing 
                    fails then relevant error message is passed in place
                    of parameters
                 class (or None)], program class pointer. If parsing fails
                    then program is None
    '''
    try:
        parameters, program = get_parameters_and_program(request_data)
        if program is None:
            return parameters, None
        valid, request_error = program.validate_request(parameters)
        if not valid:
            return request_error, None
        return parameters, program
    except Exception as e:
        return f'could not parse parameters: {e}', None


def get_program(params):
    ''' (deprecating) Maps program names to Program classes 

        Parameters: params (dict), parameters for adapter request
        Returns: Program, class pointer for desired program
        or None if params is improperly specified
    '''
    if 'locations' in params:
        return RainfallDerivative
    elif 'dates' in params:
        return CriticalSnowfallDerivative
    return None
