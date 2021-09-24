import warnings
import requests
import pandas as pd
from abc import abstractmethod
from json import JSONDecodeError

from dClimate.dweather_python_client.dweather_client import client


class CambodiaRainfallLoader():
    def __init__(self, locations=None, dataset_name=None, imperial_units=False, request_params={}):
        self._dataset_name = dataset_name
        self._locations = locations
        self._request_params = {'use_imperial_units': imperial_units, **request_params}

    def get_dataset_name(self):
        return self._dataset_name

    def get_locations(self):
        return self._locations

    def load(self):
        gridcell_histories = []
        for (lat, lon) in self._locations:
            print('lat {} lon {}'.format(lat, lon))
            series = self._load_series(lat, lon, self._dataset_name, self._request_params).sort_index()
            print('first 5: {}'.format(series[:5]))
            gridcell_histories.append(series)
        df = pd.concat(gridcell_histories, axis=1)
        result = pd.Series(df.mean(axis=1))
        print('first 5 avg: {}'.format(result[:5]))
        return result

    def _load_series(self, lat, lon, dataset_name, request_params):
        data = client.get_gridcell_history(lat, lon, dataset_name, **request_params)
        if isinstance(data, tuple):
            series = pd.Series(data[0])
        else:
            series = pd.Series(data)
        if series.empty:
            raise ValueError('No data returned for request')
        self.units = series[0].unit
        series = pd.Series([series[i].value for i in range(len(series)) if series[i] is not None])
        series = series.set_axis(pd.to_datetime(series.index, utc=True)).sort_index()
        return series
