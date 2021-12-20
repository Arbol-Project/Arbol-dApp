from datetime import datetime

from program_catalog.tools.loaders import GHCNDatasetLoader, SOLIDITY_MULTIPLIER


class CriticalSnowfallDerivative:
    ''' Program class for blizzard contracts. Validates requests,
        retrieves weather data from IPFS, computes an average over the given
        locations, and evaluates whether a payout should be awarded
    '''
    _PROGRAM_PARAMETERS = ['dates', 'station_id', 'weather_variable', 'threshold', 'dataset', 'strike', 'limit', 'opt_type']
    _PARAMETER_OPTIONS = ['exhaust', 'tick']
    _SOLIDITY_MULTIPLIERS = {
        "limit" : 10**0,
        "payout": 10**6 # USDC decimals
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
        loader = GHCNDatasetLoader(params['dates'],
                                    params['station_id'],
                                    params['weather_variable'],
                                    dataset_name=params['dataset'],
                                    imperial_units=params.get('imperial_units', True)
                                    )
        covered_history = loader.load()
        payout = cls._generate_payouts(data=covered_history,
                                        threshold=params['threshold'],
                                        opt_type=params['opt_type'],
                                        strike=params['strike'],
                                        limit=params['limit'],
                                        exhaust=params.get('exhaust', None),
                                        tick=params.get('tick', None)
                                        )
        return payout

    @classmethod
    def _generate_payouts(cls, data, threshold, limit):
        ''' Uses the provided contract parameters to calculate a payout and index

            Parameters: data (Pandas Series), weather data averaged over locations
                        start (int), unix timestamp for start date of coverage period
                        end (int), unix timestamp for end date of coverage period
                        opt_type (str), type of option contract, either PUT or CALL
                        strike (int), 10^8 times the strike value for the payout (no floats in solidity)
                        limit (int), 10^8 times the limit value for the payout (no floats in solidity)
                        exhaust (int), 10^8 times the exhaust value for the payout (no floats in solidity)
            or None if tick is not None
                        tick (number), tick value for payout or None if exhaust is not None
            Returns: int, generated payout times 10^8 (in order to report back to chain)
        '''
        limit /= cls._SOLIDITY_MULTIPLIERS['limit']
        index_value = data.max()
        if index_value > threshold:
            payout = limit
        else:
            payout = 0
        return int(payout * cls._SOLIDITY_MULTIPLIERS['payout'])