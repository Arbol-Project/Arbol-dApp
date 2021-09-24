class DataLoader():
    def __init__(self, dataset_name=None, location=None, cache=True, post_process=None):
        self._dataset_name = dataset_name
        self._location = location
        self._cache = cache
        self._cached = None

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
            # if self._post_process is not None:
            #     with rct.timeit('load post process'):
            #         result = self._post_process(result)
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
        # data = self.load().rename('Raw data')
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
            # 'post_process': serialize_func(self._post_process),
        }
