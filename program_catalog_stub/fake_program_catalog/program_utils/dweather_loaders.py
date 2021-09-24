class DClimateLoader(DataLoader):

    def __init__(self, units_mult=1, data_name=None, imperial_units=False, **kwargs):
        # self._units_mult = units_mult if isinstance(units_mult, (int, float)) else deserialize_func(units_mult)
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
            # units_mult=self._units_mult if units_mult_number else serialize_func(self._units_mult),
            data_name=self._data_name,
            imperial_units=self._request_params['use_imperial_units'],
            **base
        )


class GridcellLoader(DClimateLoader):
    """
    Load a cell from a gridded dataset. Gridded datasets are single-variate
    as of this writing.
    """
    def __init__(self, lat, lon, dataset_name, optional_params={}, **kwargs):
        """
        lat, lon (float, float): the identity of the gridcell
        dataset (str): the identity of the dataset
        """
        kwargs['dataset_name'] = dataset_name
        kwargs['location'] = {'lat': lat, 'lon': lon}
        self._request_params = optional_params
        super().__init__(**kwargs)

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
            **self._request_params,
            **base
        )

    def __repr__(self):
        return 'Grid, dataset: {}, location: {}'.format(self.get_dataset_name(), self.get_location())
