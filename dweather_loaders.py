import pandas as pd
import requests
import warnings
from json import JSONDecodeError

from base import Dataloader
from loader_stubs import box, deserialize_func, serialize_func
from dClimate.dweather_python_client.dweather_client import client


class DClimateLoader(DataLoader):

    def __init__(self, units_mult=1, data_name=None, imperial_units=False, **kwargs):
        self._units_mult = units_mult if isinstance(units_mult, (int, float)) else deserialize_func(units_mult)
        self._data_name = data_name
        self.units = None
        self._request_params = {'use_imperial_units': imperial_units}
        super().__init__(**kwargs)

    def _load(self):
        series = self._data_load()
        if self._data_name is not None:
            series = series.rename(self._data_name)
        return series * self._units_mult if isinstance(self._units_mult, (int, float)) else self._units_mult(series)

    def _data_load(self):
        raise NotImplementedError

    def _to_dict(self):
        base = super()._to_dict()
        units_mult_number = isinstance(self._units_mult, (int, float))
        return dict(
            units_mult=self._units_mult if units_mult_number else serialize_func(self._units_mult),
            data_name=self._data_name,
            imperial_units=self._request_params['use_imperial_units'],
            **base
        )


class GridcellLoader(DClimateLoader):
    """
    Load a cell from a gridded dataset. Gridded datasets are single-variate
    as of this writing.
    """
    def __init__(self, lat, lon, dataset_name, as_of=None, **kwargs):
        """
        lat, lon (float, float): the identity of the gridcell
        dataset (str): the identity of the dataset
        """
        kwargs['dataset_name'] = dataset_name
        kwargs['location'] = {'lat': lat, 'lon': lon}
        super().__init__(**kwargs)
        if as_of:
            self._request_params['as_of'] = as_of

    def _data_load(self):
        data = client.get_gridcell_history(self._location['lat'], self._dataset_name, **self._request_params)
        if isinstance(data, tuple):
            series = pd.Series(data[0])
        else:
            series = pd.Series(data)
        if series.empty:
            raise ValueError('No data returned for request: {}'.format(request))
        self.units = ' '.join(series[0].split(' ')[1:])
        series = pd.Series(data).str.split(' ').str[0].astype(float)
        series = series.set_axis(pd.to_datetime(series.index, utc=True)).sort_index()
        return series

    def _to_dict(self):
        base = super()._to_dict()
        base.pop('dataset_name', None)
        return dict(
            lat=self._location['lat'],
            lon=self._location['lon'],
            dataset_name=self.get_dataset_name(),
            as_of=self._request_params['as_of'] if 'as_of' in self._request_params else None,
            **base
        )

    def __repr__(self):
        return 'Grid, dataset: {}, location: {}'.format(self.get_dataset_name(), self.get_location())


# class StationLoader(DClimateLoader):
#     """
#     Load a timeseries for an arbitrary weather
#     variable for a given station.
#     See dweather_client.aliases_and_units.STATION_COLUMN_LOOKUP
#     for supported weather variables and their alaises.
#     """
#     def __init__(self, station_id, weather_variables, average=False, average_skipna=True, *args, **kwargs):
#         kwargs['dataset_name'] = kwargs.get('dataset_name', 'ghcnd-imputed-daily')
#         kwargs['location'] = station_id
#         super().__init__(*args, **kwargs)
#         self._weather_variables = box(weather_variables)
#         self._average = average
#         self._average_skipna = average_skipna
#
#     def _api_load(self):
#         result = []
#         for var in self._weather_variables:
#             request = '{}/ghcn-history/{}/{}'.format(API_BASE_URL, self._location, var)
#             data = pull_data(request, params=dict(dataset=self._dataset_name, **self._request_params))
#             series = pd.Series(data)
#             if series.empty:
#                 raise ValueError('No data returned for request: {}'.format(request))
#             series = series.str.split(' ').str[0].astype(float).rename(var)
#             series = series.set_axis(pd.to_datetime(series.index)).sort_index()
#             result.append(series)
#         result = pd.concat(result, axis=1)
#         if self._average:
#             result = result.mean(axis=1, skipna=self._average_skipna)
#         elif isinstance(result, pd.DataFrame):
#             result = result.squeeze()
#         return result
#
#     def _to_dict(self):
#         base = super()._to_dict()
#         return dict(
#             station_id=self._location,
#             weather_variables=self._weather_variables,
#             average=self._average,
#             average_skipna=self._average_skipna,
#             **base
#         )
#
#     def __repr__(self):
#         return 'dWeather station: {}, vars: {}, imperial units: {}'.format(
#             self._location, self._weather_variables, self._request_params['use_imperial_units']
#         )
#
#
# class AdHocLoader(DClimateLoader):
#     """
#     Loads a custom dClimate api data
#     """
#     def __init__(self, column=None, extra_api_string=None, post_process_func=None, **kwargs):
#         """
#         lat, lon (float, float): the identity of the gridcell
#         dataset (str): the identity of the dataset
#         """
#         if 'dataset_name' not in kwargs:
#             raise ValueError('"dataset_name" has to be provided')
#         super().__init__(**kwargs)
#         self._extra_api_string = extra_api_string or ''
#         self._column = column
#         self._post_process_func = deserialize_func(post_process_func)
#
#     def _api_load(self):
#         request = '{}/{}/{}'.format(API_BASE_URL, self._dataset_name, self._extra_api_string)
#         data = pull_data(request, params=self._request_params)
#         data = pd.DataFrame([dict(dt=k, **d) for k, d in data.items()]).assign(
#             dt=lambda dfx: pd.to_datetime(dfx.dt, utc=True)
#         ).set_index('dt').sort_index()
#         if self._column is not None:
#             data = data[self._column]
#         return self._post_process_func(data) if self._post_process_func is not None else data
#
#     def _to_dict(self):
#         base = super()._to_dict()
#         return dict(
#             column=self._column,
#             extra_api_string=self._extra_api_string,
#             post_process_func=serialize_func(self._post_process_func),
#             **base
#         )
