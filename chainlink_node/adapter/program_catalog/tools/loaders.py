import os
import ast
import pandas as pd

from dweather.dweather_client import client


class dAppLoader:
    ''' Base loader class for Arbol dApp weather contracts. Uses dWeather Python client
        to get historical weather data from IPFS and computes a single time series 
        for a specified station or averaged over a number of locations
    '''
    def __init__(self, dataset_name, imperial_units=False, **kwargs):
        ''' On initialization each Loader instance sets the dataset to pull from
            and any additional request parameters

            Parameters: dataset_name (str), the name of the dataset on IPFS
                        imperial_units (bool), whether to use imperial units
                        kwargs (dict), additional request parameters
        '''
        self._dataset_name = dataset_name
        self._request_params = {'use_imperial_units': imperial_units, **kwargs}

    def load(self):
        ''' Loading function to be implemented by subclasses '''
        raise NotImplementedError


class GFDatasetLoader(dAppLoader):
    ''' Loader class for grid file datasets. Uses dWeather Python client
        to get historical gridcell data from IPFS for specified locations and
        computes single time series averaged over all locations
    '''
    def __init__(self, locations, dataset_name, imperial_units=False, **kwargs):
        ''' On initialization each Loader instance sets the locations for which to
            get the historical weather data and the dataset to pull from

            Parameters: locations (list), list of lat/lon coordinate pairs as strings
                        dataset_name (str), the name of the dataset on IPFS
                        imperial_units (bool), whether to use imperial units
                        kwargs (dict), additional request parameters
        '''
        super().__init__(dataset_name, imperial_units=imperial_units, **kwargs)
        self._locations = [ast.literal_eval(location) for location in locations]

    def load(self):
        ''' Loads the weather data time series from IPFS for each specified
            location and averages the desired quantities to produce a single
            time series of historical averages

            Returns: Pandas Series, time series for desired weather data averaged
            across all locations specified during initialization
        '''
        gridcell_histories = []
        for (lat, lon) in self._locations:
            series = self._load_series(lat, lon)
            gridcell_histories.append(series)
        df = pd.concat(gridcell_histories, axis=1)
        result = pd.Series(df.mean(axis=1))
        return result

    def _load_series(self, lat, lon):
        ''' Loads a Pandas Series from IPFS for a given lat/lon coordinate pair

            Parameters: lat (float), latitude of location
                        lon (float), longitude of location
            Returns: Pandas Series, historical weather data for the given location
        '''
        data = client.get_gridcell_history(lat, lon, self._dataset_name, **self._request_params)
        if isinstance(data, tuple):
            series = pd.Series(data[0])
        else:
            series = pd.Series(data)
        if series.empty:
            raise ValueError('No data returned for request')
        series = series.set_axis(pd.to_datetime(series.index, utc=True)).sort_index()
        return series


class GHCNDatasetLoader(dAppLoader):
    ''' Loader class for GHCN station datasets. Uses dWeather Python client
        to get historical GHCN data from IPFS for specified weather station
    '''
    def __init__(self, station_id, weather_variable, dataset_name='ghcnd', imperial_units=False, **kwargs):
        ''' On initialization each Loader instance sets the locations for which to
            get the historical weather data and the dataset to pull from

            Parameters: locations (list), list of lat/lon coordinate pairs as strings
                        dataset_name (str), the name of the dataset on IPFS
                        imperial_units (bool), whether to use imperial units
        '''
        super().__init__(dataset_name, imperial_units=imperial_units, **kwargs)
        self._station_id = station_id
        self._weather_variable = weather_variable

    def load(self):
        ''' Loads the dataset history from IPFS for the specified station ID
            and weather variable

            Returns: Pandas Series, time series for station weather data
        '''
        station_history = []
        data = client.get_station_history(self._station_id, self._weather_variable, **self._request_params)
        series = pd.Series(data)
        if series.empty:
            raise ValueError('No data returned for request')
        series = series.set_axis(pd.to_datetime(series.index)).sort_index()
        print(series)
        return series
