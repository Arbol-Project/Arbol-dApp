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
    # check for node key, required for all job types
    node_key = request_data.get('nodeKey', None)
    if node_key is None:
        return 'node key missing', None

    # get job type (currently, evaluation or reencryption)
    job_type = request_data.get('jobType', None)
    if job_type is None:
        return 'job type (reencryption, evaluation) missing', None
    elif job_type == "reencryption":
        print(f'reencryption job node key {node_key}', flush=True)
        # reencryption job requires public key of new viewer
        public_key = request_data.get('viewerAddressPublicKey', None)
        if public_key is None:
            return 'public key missing', None
        parameters = {
            "node_key": node_key, 
            "public_key": public_key
        }
        program = Reencryption
    else:
        # evaluation job requires program name, start date, end date, and remaining encrypted terms (URI)
        request_uri = request_data.get('uri', None)
        if request_uri is None:
            return 'token URI missing', None
        print(f'evaluation job uri {request_uri}', flush=True)
        request_start_date = request_data.get('startDate', None)
        if request_start_date is None:
            return 'request start date is missing', None
        request_end_date = request_data.get('endDate', None)
        if request_end_date is None:
            return 'request end date is missing', None
        program_name = request_data.get('programName', None)
        if program_name is None:
            return 'request program name is missing', None

        # uses node's private key to decrypt node_key to decrypt request_uri
        try:
            parameters = decrypt(node_key, request_uri)
        except Exception as e:
            return f'could not decode: {e}', None

        # uses node's private key to decrypt node_key to decrypt request_uri
        parameters['start'] = parse_timestamp(request_start_date)
        parameters['end'] = parse_timestamp(request_end_date)
        if 'GRP' in program_name or 'XSR' in program_name:
            program = RainfallDerivative
            parameters['imperial_units'] = True # force imperial units for GRP and XSR
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
        print(f'parsing parameters {request_data}', flush=True)
        parameters, program = get_parameters_and_program(request_data)
        if program is None:
            return parameters, None
        print(f'validating parameters {parameters}', flush=True)
        valid, request_error = program.validate_request(parameters)
        if not valid:
            return request_error, None
        return parameters, program
    except Exception as e:
        return f'could not parse parameters: {e}', None


def get_program(params):
    ''' (deprecated) Maps program names to Program classes 

        Parameters: params (dict), parameters for adapter request
        Returns: Program, class pointer for desired program
        or None if params is improperly specified
    '''
    if 'locations' in params:
        return RainfallDerivative
    elif 'dates' in params:
        return CriticalSnowfallDerivative
    return None
