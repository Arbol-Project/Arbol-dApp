import pandas as pd

from dweather_python_client.dweather_client import client


class ArbolLoader:
    ''' Loader class for Arbol dApp weather contracts. Uses dWeather Python client
        to get historical gridcell data from IPFS for specified locations and
        computes single time series averaged over all locations
    '''
    def __init__(self, locations=None, dataset_name=None, imperial_units=False):
        ''' On initialization each Loader instance sets the locations for which to
            get the historical weather data and the dataset to pull from

            Parameters: locations (nested list), list of lat/lon coordinate pairs
                        dataset_name (str), the name of the dataset on IPFS
                        imperial_units (bool), whether to use imperial units
        '''
        self._dataset_name = dataset_name
        self._locations = locations
        self._request_params = {'use_imperial_units': imperial_units}

    def load(self):
        ''' Loads the weather data time series from IPFS for each specified
            location and averages the desired quantities to produce a single
            time series of historical averages

            Returns: Pandas Series, time series for desired weather data averaged
            across all locations specified during initialization
        '''
        gridcell_histories = []
        for (lat, lon) in self._locations:
            print((lat, lon))
            series = self._load_series(lat, lon, self._dataset_name, self._request_params).sort_index()
            gridcell_histories.append(series)
        df = pd.concat(gridcell_histories, axis=1)
        result = pd.Series(df.mean(axis=1))
        return result

    def _load_series(self, lat, lon, dataset_name, request_params):
        ''' Loads a Pandas Series from IPFS for a given lat/lon coordinate pair

            Returns: Pandas Series, historical weather data for the given location
        '''
        data = client.get_gridcell_history(lat, lon, dataset_name, **request_params)
        if isinstance(data, tuple):
            series = pd.Series(data[0])
        else:
            series = pd.Series(data)
        if series.empty:
            raise ValueError('No data returned for request')
        series = pd.Series([series[i].value for i in range(len(series)) if series[i] is not None])
        series = series.set_axis(pd.to_datetime(series.index, utc=True)).sort_index()
        return series
