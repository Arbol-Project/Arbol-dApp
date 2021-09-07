import os

PARAM_CONFIGS = \
{
    'Account Registration-Token':
    {
        'endpoint': 'user/get_token',
        'required_params': ['email', 'password'],
        'default_params': {},
        'optional_params': [],
    },
    'Account Registration-Register':
    {
        'endpoint': 'user/register',
        'required_params': ['email', 'password', 'first_name', 'last_name', 'country', 'organization'],
        'default_params': {},
        'optional_params': [],
    },
    'Dataset Information':
    {
        'endpoint': 'metadata',
        'required_params': ['dataset'],
        'default_params':
        {
            'full_metadata': False
        },
        'optional_params': [],
    },
    'Grid File Dataset History':
    {
        'endpoint': 'grid-history',
        'required_params': ['dataset', 'lat', 'lon'],
        'default_params':
        {
            'also_return_metadata': False,
            'use_imperial_units': True,
            'also_return_snapped_coordinates': True,
            'convert_to_local_time': True,
        },
        'optional_params': ['as_of'],
    },
    'GFS Forecasts':
    {
        'endpoint': 'forecasts',
        'required_params': ['dataset', 'lat', 'lon', 'forecast_date'],
        'default_params':
        {
            'also_return_metadata': False,
            'use_imperial_units': True,
            'also_return_snapped_coordinates': True,
            'convert_to_local_time': True,
        },
        'optional_params': [],
    },
    'GHCN Dataset History':
    {
        'endpoint': 'ghcn-history',
        'required_params': ['station_id', 'weather_variable'],
        'default_params':
        {
            'dataset': 'ghcnd',
            'use_imperial_units': True
        },
        'optional_params': [],
    },
    'Tropical Storms Data':
    {
        'endpoint': 'storms',
        'required_params': ['source', 'basin'],
        'default_params': {},
        'optional_params': ['radius', 'lat', 'lon', 'min_lat', 'main_lon', 'max_lat', 'max_lon'],
    },
    'USDA RMA Codes-Counties':
    {
        'endpoint': 'rma-code-lookups/valid_counties',
        'required_params': ['state'],
        'default_params': {},
        'optional_params': [],
    },
    'USDA RMA Codes-States':
    {
        'endpoint': 'rma-code-lookups/valid_states',
        'required_params': [],
        'default_params': {},
        'optional_params': [],
    },
    'SCO Yield History-Valid':
    {
        'endpoint': 'yield/valid_commodities',
        'required_params': ['state', 'county'],
        'default_params': {},
        'optional_params': [],
    },
    'SCO Yield History-Commodity':
    {
        'endpoint': 'yield',
        'required_params': ['commodity', 'state', 'county'],
        'default_params':
        {
            'impute': False
        },
        'optional_params': [],
    },
    'Transitional Yield Values-Valid':
    {
        'endpoint': 'transitional_yield/valid_commodities',
        'required_params': ['state', 'county'],
        'default_params': {},
        'optional_params': [],
    },
    'Transitional Yield Values-Commodity':
    {
        'endpoint': 'transitional_yield',
        'required_params': ['commodity', 'state', 'county'],
        'default_params': {},
        'optional_params': [],
    },
    'FSA Irrigation Data':
    {
        'endpoint': 'irrigation_splits',
        'required_params': ['commodity'],
        'default_params': {},
        'optional_params': [],
    },
}

def set_account_registration_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = config['endpoint']
    params = {}
    for param in config['required_params']:
        params[param] = data.get(param)
    return endpoint, params

def set_dataset_information_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = os.path.join(config['endpoint'], data.get('dataset'))
    params = {}
    for param in config['default_params']:
        params[param] = data.get(param, config['default_params'][param])
    return endpoint, params

def set_grid_file_dataset_history_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = os.path.join(config['endpoint'], data.get('dataset'))
    endpoint = os.path.join(endpoint, '{}_{}'.format(data.get('lat'), data.get('lon')))
    params = {}
    for param in config['default_params']:
        params[param] = data.get(param, config['default_params'][param])
    for param in config['optional_params']:
        if param in data:
            params[param] = data.get(param)
    return endpoint, params

def set_gfs_forecasts_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = os.path.join(config['endpoint'], data.get('dataset'))
    endpoint = os.path.join(endpoint, '_'.join([data.get('lat'), data.get('lon')]))
    params = {'forecast_date': data.get('forecast_date')}
    for param in config['default_params']:
        params[param] = data.get(param, config['default_params'][param])
    return endpoint, params

def set_ghcn_dataset_history_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = os.path.join(config['endpoint'], data.get('station_id'))
    endpoint = os.path.join(endpoint, data.get('weather_variable'))
    params = {}
    for param in config['default_params']:
        params[param] = data.get(param, config['default_params'][param])
    return endpoint, params

def set_tropical_storms_data_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = os.path.join(config['endpoint'], data.get('source'))
    endpoint = os.path.join(endpoint, data.get('basin'))
    params = {}
    for param in config['optional_params']:
        if param in data:
            params[param] = data.get(param)
    return endpoint, params

def set_usda_rma_codes_params(data, key):
    config = PARAM_CONFIGS[key]
    if 'state' in data:
        endpoint = os.path.join(config['endpoint'], data.get('state'))
    else:
        endpoint = config['endpoint']
    params = {}
    return endpoint, params

def set_sco_yield_history_params(data, key):
    config = PARAM_CONFIGS[key]
    if 'commodity' in data:
        endpoint = os.path.join(endpoint, '_'.join([data.get('commodity'), data.get('state'), data.get('county')]))
    else:
        endpoint = os.path.join(endpoint, '_'.join([data.get('state'), data.get('county')]))
    params = {}
    for param in config['default_params']:
        params[param] = data.get(param, config['default_params'][param])
    return endpoint, params

def set_transitional_yield_values_params(data, key):
    config = PARAM_CONFIGS[key]
    if 'commodity' in data:
        endpoint = os.path.join(endpoint, '_'.join([data.get('commodity'), data.get('state'), data.get('county')]))
    else:
        endpoint = os.path.join(endpoint, '_'.join([data.get('state'), data.get('county')]))
    params = {}
    return endpoint, params

def set_fsa_irrigation_data_params(data, key):
    config = PARAM_CONFIGS[key]
    endpoint = os.path.join(config['endpoint'], data.get('commodity'))
    params = {}
    return endpoint, params

PARAM_SETTERS = \
{
    'Account Registration-Token': set_account_registration_params,
    'Account Registration-Register': set_account_registration_params,
    'Dataset Information': set_dataset_information_params,
    'Grid File Dataset History': set_grid_file_dataset_history_params,
    'GFS Forecasts': set_gfs_forecasts_params,
    'GHCN Dataset History': set_ghcn_dataset_history_params,
    'Tropical Storms Data': set_tropical_storms_data_params,
    'USDA RMA Codes-Counties': set_usda_rma_codes_params,
    'USDA RMA Codes-States': set_usda_rma_codes_params,
    'SCO Yield History-Valid': set_sco_yield_history_params,
    'SCO Yield History-Commodity': set_sco_yield_history_params,
    'Transitional Yield Values-Valid': set_transitional_yield_values_params,
    'Transitional Yield Values-Commodity': set_transitional_yield_values_params,
    'FSA Irrigation Data': set_fsa_irrigation_data_params,
}
