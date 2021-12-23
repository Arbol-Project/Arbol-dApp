from datetime import datetime

from program_catalog.tools.loaders import GFDatasetLoader


class RainfallDerivative:
    ''' Program class for rainfall contracts. Validates requests,
        retrieves weather data from IPFS, computes an average over the given
        locations, and evaluates whether a payout should be awarded
    '''
    _PROGRAM_PARAMETERS = ['dataset', 'locations', 'start', 'end', 'strike', 'limit', 'opt_type']
    _PARAMETER_OPTIONS = ['exhaust', 'tick']
    _SOLIDITY_MULTIPLIERS = {
        "strike" : 10**0,
        "limit" : 10**0,
        "exhaust" : 10**0,
        "tick" : 10**0,
        "payout": 10**2
    }

    @classmethod
    def validate_request(cls, params):
        ''' Uses program-specific parameter requirements to validate a given
            request. Guarantees that there will be a non-null exhaust or tick
            value in the request parameters to generate the payout

            Parameters: params (dict), parameters to be checked against the
            requirements
            Returns: bool, whether the request format is valid
                     str, error message in the event that the request is not valid
        '''
        result = True
        result_msg = ''
        for param in cls._PROGRAM_PARAMETERS:
            if not param in params:
                result_msg += f'missing {param} parameter\n'
                result = False
        for param in cls._PARAMETER_OPTIONS:
            if param in params and params.get(param, None) is not None:
                return result, result_msg
        result_msg += f'no non-null parameter in {cls._PARAMETER_OPTIONS} detected\n'
        result = False
        return result, result_msg

    @classmethod
    def serve_evaluation(cls, params):
        ''' Loads the relevant geospatial historical weather data and computes
            a payout and an index

            Parameters: params (dict), dictionary of required contract parameters
            Returns: number, the determined payout (0 if not awarded)
        '''
        loader = GFDatasetLoader(params['locations'],
                                params['dataset'],
                                imperial_units=params.get('imperial_units', True)
                                )
        avg_history = loader.load()
        payout = cls._generate_payouts(data=avg_history,
                                        start=params['start'],
                                        end=params['end'],
                                        opt_type=params['opt_type'],
                                        strike=params['strike'],
                                        limit=params['limit'],
                                        exhaust=params.get('exhaust', None),
                                        tick=params.get('tick', None)
                                        )
        return payout

    @classmethod
    def _generate_payouts(cls, data, start, end, opt_type, strike, limit, exhaust, tick):
        ''' Uses the provided contract parameters to calculate a payout and index

            Parameters: data (Pandas Series), weather data averaged over locations
                        start (str), unix timestamp for start date of coverage period
                        end (str), unix timestamp for end date of coverage period
                        opt_type (str), type of option contract, either PUT or CALL
                        strike (str), 10^8 times the strike value for the payout (no floats in solidity)
                        limit (str), 10^8 times the limit value for the payout (no floats in solidity)
                        exhaust (str), 10^8 times the exhaust value for the payout (no floats in solidity)
            or None if tick is not None
                        tick (str), tick value for payout or None if exhaust is not None
            Returns: int, generated payout times 10^8 (in order to report back to chain)
        '''
        strike = float(strike) * cls._SOLIDITY_MULTIPLIERS['strike']
        limit = float(limit) * cls._SOLIDITY_MULTIPLIERS['limit']
        start_date = datetime.utcfromtimestamp(int(start)).strftime('%Y-%m-%d')
        end_date = datetime.utcfromtimestamp(int(end)).strftime('%Y-%m-%d')
        index_value = data.loc[start_date:end_date].sum()
        opt_type = opt_type.lower()
        direction = 1 if opt_type == 'call' else -1
        if tick is None:
            exhaust = float(exhaust) * cls._SOLIDITY_MULTIPLIERS['exhaust']
            tick = abs(limit / (strike - exhaust))
        else:
            tick = float(tick) * cls._SOLIDITY_MULTIPLIERS['tick']
        payout = (index_value - strike) * tick * direction
        if payout < 0:
            payout = 0
        if payout > limit:
            payout = limit
        return int(float(round(payout, 2)) * cls._SOLIDITY_MULTIPLIERS['payout'])
