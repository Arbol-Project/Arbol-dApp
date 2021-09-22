import warnings
import pandas as pd
from abc import abstractmethod
from risk.tools.serialize import Serializable
from risk.tools.serialize import df2string, string2df, serialize_func, deserialize_func
from risk.tools.context.current import RiskContext


class DataLoader(Serializable):
    def __init__(self, dataset_name=None, location=None, cache=True, post_process=None):
        self._dataset_name = dataset_name
        self._location = location
        self._cache = cache
        self._cached = None
        self._post_process = deserialize_func(post_process)
        if self._post_process is not None and not callable(self._post_process):
            raise ValueError('"post_process" should be a callable, found: {}'.format(self._post_process))

    def get_dataset_name(self):
        return self._dataset_name

    def get_location(self):
        return self._location

    def load(self):
        with RiskContext.current.timing(self.__class__.__name__) as rct:
            if self._cached is not None:
                with rct.timeit('cached'):
                    return self._cached
            with rct.timeit('load'):
                result = self._load().sort_index()
            if self._post_process is not None:
                with rct.timeit('load post process'):
                    result = self._post_process(result)
            if isinstance(result.index, pd.MultiIndex):
                pass
            elif not isinstance(result.index, (pd.Int64Index, pd.DatetimeIndex)):
                raise TypeError('Incorrect index type, should be of DatetimeIndex or Int64Index with each key as a '
                                'year. Found: {}'.format(result.index))
            if self._cache:
                self._cached = result
            return result

    def plot(self, **kwargs):
        kwargs['color'] = kwargs.get('color', 'black')
        data = self.load().rename('Raw data')
        if data.shape[0] > 50000:
            warnings.warn('Raw data is too long, taking last 50k rows')
            data = data.iloc[-50000:]
        ax = data.plot(**kwargs)
        ax.set_title('Raw loader data\n' + self.__repr__()[:80])

    @abstractmethod
    def _load(self):
        raise NotImplementedError

    def _to_dict(self):
        return {
            'dataset_name': self._dataset_name,
            'location': self._location,
            'cache': self._cache,
            'post_process': serialize_func(self._post_process),
        }


class CustomDataLoader(DataLoader):
    def __init__(self, data, serialize_data=True, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._data = string2df(string=data) if isinstance(data, (bytes, str)) else data
        self._serialize_data = serialize_data

    def _load(self):
        return self._data

    def _to_dict(self):
        return dict(
            data=df2string(self._data) if self._serialize_data else None,
            serialize_data=self._serialize_data,
            **super()._to_dict()
        )

    def __repr__(self):
        return 'Custom data loader, shape: {}'.format(self._data.shape)


class MultiLoader(DataLoader):
    """
    Combine the output of multiple loaders into a single record.

    For example, get max and min temperature from two different datasets
    and average them, or get windspeed in two different directions and
    add them.

    Or combine the output of multiple loaders into a single record by weights

    Depending on the 'function', the result may have combined units.
    """
    def __init__(self, loaders, function, **kwargs):
        """
        loaders: an iterable of instantiated
        """
        self._sub_loaders = loaders
        self._function = deserialize_func(function)
        super().__init__(dataset_name=self.get_dataset_name(), location=self.get_location(), cache=False)

    def get_dataset_name(self):
        raw_datasets = list(set([l.get_dataset_name() or '' for l in self._sub_loaders]))
        datasets = ', '.join(raw_datasets)
        datasets = datasets if len(datasets) <= 30 else '{} dataset(-s)'.format(len(raw_datasets))
        return datasets

    def get_location(self):
        raw_locations = [str(l.get_location()) or '' for l in self._sub_loaders]
        locations = ', '.join(raw_locations)
        locations = locations if len(locations) <= 30 else '{} location(-s)'.format(len(raw_locations))
        return locations

    def _load(self):
        return self._function(*[loader.load() for loader in self._sub_loaders])

    def _to_dict(self):
        parent = super()._to_dict()
        return dict(
            loaders=[loader.to_dict() for loader in self._sub_loaders],
            function=serialize_func(self._function),
            **parent
        )

    def __repr__(self):
        return 'Multi-loader. Datasets: {}, locations: {}'.format(self.get_dataset_name(), self.get_location())
