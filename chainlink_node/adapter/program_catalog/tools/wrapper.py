import io
import json
import re
import ast
import pandas as pd
from datetime import timezone, datetime, date, time
from urllib.parse import urlparse

from dweather.dweather_client import client, http_queries


'''
n.b. - making change to schema at drought_monitoring ({state}-{county} changed to {state}_{county} as elsewhere),
     the importance being that it is now assumed that '-' is not a separating character for parameters in a request URL

     - also everything called in client (forked) now returns a dict with a pandas object with key "data"

not implemented

ceda-biomass
rma-code-lookups/valid_counties
rma-code-lookups/valid_states
transitional_yield/valid_commodities
yield/valid_commodities


need to try
    irrigation
    yield
    tropical storms
'''

def get_ceda_biomass_wrapper(args):
    ''' Returns dict with BytesIO '''
    data = client.get_ceda_biomass(**args)
    return data


def get_forecasts_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"also_return_metadata": False, "also_return_snapped_coordinates": True, "use_imperial_units": True, "desired_units": None, "ipfs_timeout": None, "convert_to_local_time": True}
    default_args.update(args)
    data = client.get_forecast(**default_args)
    return data


def get_drought_monitor_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    data = client.get_drought_monitor_history(**args)
    return data

 
def get_cme_station_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"desired_units": None, "ipfs_timeout": None}
    default_args.update(args)
    data = client.get_cme_station_history(**default_args)
    return data


def get_dutch_station_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"dataset": "dutch_stations-daily", "desired_units": None, "ipfs_timeout": None}
    default_args.update(args)
    data = client.get_european_station_history(**default_args)
    return data


def get_german_station_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"dataset": "dwd_stations-daily", "desired_units": None, "ipfs_timeout": None}
    default_args.update(args)
    data = client.get_european_station_history(**default_args)
    return data


def get_japan_station_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"ipfs_timeout": None}
    default_args.update(args)
    data = client.get_japan_station_history(**default_args)
    return data


def get_tropical_storms_wrapper(args):
    ''' Returns dict with pd.DataFrame '''
    data = client.get_tropical_storms(**args)
    return data


def get_irrigation_data_wrapper(args):
    ''' Returns dict with pd.DataFrame '''
    default_args = {"ipfs_timeout": None}
    default_args.update(args)
    data = client.get_irrigation_data(**default_args)
    return data


def get_transitional_yield_history_wrapper(args):
    ''' Returns dict with pd.DataFrame '''
    if args.get('impute', False):
        args['dataset'] = 'rma_t_yield_imputed-single-value'
    else:
        args['dataset'] = 'rma_t_yield-single-value'
    default_args = {"impute": False}
    default_args.update(args)
    data = client.get_yield_history(**default_args)
    return data


def get_yield_history_wrapper(args):
    ''' Returns dict with pd.DataFrame '''
    if args.get('impute', False):
        args['dataset'] = 'rmasco_imputed-yearly'
    elif args.get('fill', False):
        args['dataset'] = 'sco_vhi_imputed-yearly'
    else:
        args['dataset'] = 'sco-yearly'
    default_args = {"impute": False, "fill": False}
    default_args.update(args)
    data = client.get_yield_history(**default_args)
    return data


def get_station_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"dataset": "ghcnd", "station_id": "USW00003016", "use_imperial_units": True, "desired_units": None, "ipfs_timeout": None}
    default_args.update(args)
    data = client.get_station_history(**default_args)
    data['data'] = pd.Series(data['data'])
    if data.empty:
        raise ValueError('No data returned for request')
    data['data'] = data['data'].set_axis(pd.to_datetime(data['data'].index)).sort_index()
    return data


def get_gridcell_history_wrapper(args):
    ''' Returns dict with pd.Series '''
    default_args = {"also_return_metadata": False, "also_return_snapped_coordinates": True, "use_imperial_units": True, "desired_units": None, "ipfs_timeout": None, "as_of": None, "convert_to_local_time": True}
    default_args.update(args)
    data = client.get_gridcell_history(**default_args)
    data['data'] = data['data'].set_axis(pd.to_datetime(data['data'].index, utc=True)).sort_index()
    return data


def get_metadata_wrapper(args):
    ''' Returns dict '''
    hash = client.get_heads()[args['dataset']]
    metadata = client.get_metadata(hash)
    if args.get('full_metadata', False):
        return metadata
    if args['dataset'] in client.GRIDDED_DATASETS.keys():
        return {
            **metadata["api documentation"],
            "name": metadata["name"],
            "update frequency": metadata["update frequency"],
            "time last generated": metadata["time generated"],
            "latitude range": metadata["latitude range"],
            "longitude range": metadata["longitude range"],
        }
    elif args['dataset'] in ["ghcnd", "ghcnd-imputed-daily"]:
        return {
            **metadata["api documentation"],
            "name": metadata["name"],
            "update frequency": metadata["update frequency"],
            "stations url": http_queries.GATEWAY_URL + f"/ipfs/{hash}/{metadata['stations file']}",
            "time last generated": metadata["time generated"]
        }
    return metadata


def get_api_mapping(file_path):
    client_wrapper = {
        'ceda-biomass': get_ceda_biomass_wrapper,
        'cme-history': get_cme_station_history_wrapper,
        'drought-monitor': get_drought_monitor_history_wrapper,
        'dutch-station-history': get_dutch_station_history_wrapper,
        'forecasts': get_forecasts_wrapper,
        'german-station-history': get_german_station_history_wrapper,
        'ghcn-history': get_station_history_wrapper,
        'grid-history': get_gridcell_history_wrapper,
        'irrigation_splits': get_irrigation_data_wrapper,
        'metadata': get_metadata_wrapper,
        'storms': get_tropical_storms_wrapper,
        'transitional_yield': get_transitional_yield_history_wrapper,
        'yield': get_yield_history_wrapper,
        'japan-station-history': get_japan_station_history_wrapper
    }
    with open(file_path, 'r') as swagger:
        api = json.load(swagger)
        swagger.close()

    # parse swagger and get parameters and url endpoints
    api_map = {'basePath': api['basePath'] + '/', 'paths': {}}
    for path in api['paths'].keys():
        if 'user' in path or 'valid' in path or 'biomass' in path:
            continue
        key = path[:path.find('/{')][1:] if '/{' in path else path[1:]
        types = {}
        primary = re.findall(r'(?<=\{).+?(?=\})', path) if '/{' in path else []
        secondary = []
        for param in api['paths'][path].get('parameters', []):
            types[param['name']] = param['type']
        for param in api['paths'][path].get('get', {}).get('parameters', []):
            if param['name'] != 'Authorization':
                secondary.append(param['name'])
                types[param['name']] = param['type']
        api_map['paths'][key] = {'name': path, 'primary': primary, 'secondary': secondary, 'types': types, 'function': client_wrapper[key]}
    return api_map


API_MAP = get_api_mapping('swagger.json')


def parse_request(data):
    # check basePath version
    valid = True
    if not data.startswith(API_MAP['basePath']):
        valid = False
        return 'Incompatible API version, please use ' + API_MAP['basePath'], valid
    request_data = data.removeprefix(API_MAP['basePath'])

    # get endpoint
    request_parsed = list(urlparse(request_data))
    request_paths = re.split('/', request_parsed[2])
    key = request_paths[0]
    api_endpoint = API_MAP['paths'].get(key, None)
    if api_endpoint is None:
        valid = False
        return 'Improperly formatted request URL, endpoint not found', valid

    # get primary parameters
    args = {}
    endpoint_primaries = api_endpoint['primary']
    endpoint_secondaries = api_endpoint['secondary']
    if 'dataset' in endpoint_primaries:
        params = [request_paths[1]]
        for req in request_paths[2:]:
            params += re.split('_', req)
    else:
        params = re.split('_|/', request_parsed[2])[1:]
    if request_parsed[4] == '':
        queries = []
    else:
        queries = request_parsed[4].split('&')
    if len(params) != len(endpoint_primaries):
        valid = False
        return 'Improperly formatted request URL, incompatible parameters', valid

    # cast floats and set primary args
    floats = ['lat', 'lon', 'radius', 'max_lat', 'max_lon', 'min_lat', 'min_lon']
    for i in range(len(endpoint_primaries)):
        param = endpoint_primaries[i]
        if param in floats:
            args[param] = float(params[i])
        else:
            args[param] = params[i]

    # parse secondary parameters
    for j in range(len(queries)):
        param = queries[j][:queries[j].find('=')]
        value = queries[j][queries[j].find('='):][1:]
        param_type = API_MAP['paths'][key]['types'][param]
        if not param in endpoint_secondaries:
            valid = False
            return 'Improperly formatted request URL, incompatible parameters', valid

        # type check parameters and set secondary args
        if param in floats:
            args[param] = float(params[i])
        if param_type != 'string':
            if param_type == 'boolean':
                value = value.capitalize()
            value = ast.literal_eval(value)
        args[param] = value
    args['_key'] = key
    return args, valid


def get_request_data(args):
    key = args.pop('_key')
    api_endpoint = API_MAP['paths'].get(key, None)
    data = api_endpoint['function'](args)
    return data


def operate_on_data(data, ops, args):
    ''' 
        data is dict iff metadata and BytesIO iff CEDA (basically not supported)
            and pd.Series/pd.DataFrame otherwise 
        18 digits of precision on decimals 
        times are returned as timestamps starting at beginning of unix epoch
        dates are returned as timestamps starting at beginning of unix epoch to start of date
        ms on timestamps
    '''
    if type(data) is dict or type(data) is io.BytesIO:
        return data
    # results = []
    reset = data
    for i, op in enumerate(ops):
        pandas_op = getattr(data, op)
        op_params = ast.literal_eval(args[i])
        return_result = op_params.pop(0)
        carry_forward = op_params.pop(0)
        result = pandas_op(*op_params)
        if return_result:
            if type(result) is date:
                result = datetime(result.year, result.month, result.day)
            if type(result) is time:
                result = datetime(0, 0, 0, result.hour, result.minute, result.second, result.microsecond)
            if type(result) is datetime:
                # results.append(str(int(result.replace(tzinfo=timezone.utc).timestamp() * 1000)))
                return int(result.replace(tzinfo=timezone.utc).timestamp() * 1000)
            elif type(result) is time:
                return ""
            elif 'float' in str(type(result)) or 'int' in str(type(result)):
                # results.append(str(int(float(result) * 1e18)))
                 return int(float(result) * 1e18)
            elif type(result) is pd.Series or type(result) is pd.DataFrame:
                # results.append(result.to_string())
                # need to route this through a separate job
                 return result.to_string()
            else:
                # results.append(str(result))
                # need to route this through a separate job
                return str(result)
        if carry_forward:
            data = result
        else:
            data = reset
    return ["No Return Specified"]

