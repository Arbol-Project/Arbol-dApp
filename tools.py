from dClimate.dweather_python_client.dweather_client import client

def parse_and_get_gridcell_history(data):
    dataset = data.get('dataset')
    lat = data.get('lat')
    lon = data.get('lon')
    also_return_snapped_coordinates = data.get('also_return_snapped_coordinates', False)
    also_return_metadata = data.get('also_return_metadata', False)
    use_imperial_units = data.get('use_imperial_units', True)
    convert_to_local_time = data.get('convert_to_local_time', True)
    as_of = data.get('as_of', None)
    ipfs_timeout = data.get('ipfs_timeout', None)
    return client.get_gridcell_history(lat, lon, dataset, also_return_snapped_coordinates, also_return_metadata, use_imperial_units, convert_to_local_time, as_of, ipfs_timeout)

CONFIGS = \
{
    'gridcell-history':
    {
        'getter': parse_and_get_gridcell_history,
        'required_params': ['dataset', 'lat', 'lon'],
        'optional_params':
        {
            'also_return_snapped_coordinates': False,
            'also_return_metadata': False,
            'use_imperial_units': True,
            'convert_to_local_time': True,
            'as_of': None,
            'ipfs_timeout': None
        }
    },

}
