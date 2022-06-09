from datetime import datetime

from program_catalog.tools.loaders import StationLoader


class CriticalSnowfallDerivative:
    ''' Program class for blizzard contracts. Validates requests,
        retrieves weather data from IPFS, computes an average over the given
        locations, and evaluates whether a payout should be awarded
    '''
    _PROGRAM_PARAMETERS = ['dates', 'station_id', 'weather_variable', 'threshold', 'dataset', 'limit', 'opt_type']
    _PARAMETER_OPTIONS = ['strike', 'exhaust', 'tick']
    _OUTPUT_MULTIPLIER = 10**6


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
            if params.get(param, None) is None:
                result_msg += f'missing {param} parameter\n'
                result = False
        for param in cls._PARAMETER_OPTIONS:
            if params.get(param, None) is not None:
                return result, result_msg
        result_msg += f'no non-null parameter in {cls._PARAMETER_OPTIONS} detected\n'
        result = False
        return result, result_msg

    @classmethod
    def serve_request(cls, params):
        ''' Loads the relevant geospatial historical weather data and computes
            a payout and an index

            Parameters: params (dict), dictionary of required contract parameters
            Returns: number, the determined payout (0 if not awarded)

            N.B.2 Resolving contract without evaluation             [04-18-2022]
            N.B.3.1 Undoing changes after conclusion                [05-13-2022]
        '''
        loader = StationLoader(params['dates'],
                                    params['station_id'],
                                    params['weather_variable'],
                                    dataset_name=params['dataset'],
                                    imperial_units=params.get('imperial_units', True)
                                    )
        covered_history = loader.load()
        payout = cls._generate_payouts(data=covered_history,
                                        threshold=params['threshold'],
                                        opt_type=params['opt_type'],
                                        limit=params['limit'],
                                        )
        return payout
        # return 0

    @classmethod
    def _generate_payouts(cls, data, threshold, opt_type, limit):
        ''' Uses the provided contract parameters to calculate a payout and index

            Parameters: data (Pandas Series), weather data for covered dates
                        threshold (str), string of int for weather variable threshold in inches
                        opt_type (str), type of option contract, either PUT or CALL
                        strike (str), string of num for strike value for the payout
                        limit (str), string of num for limit value for the payout
                        exhaust (str), string of num for exhaust value for the payout or None if tick is not None
                        tick (str), string of num for tick value for payout or None if exhaust is not None
            Returns: int, generated payout times 10^6 (in order to report back to chain in value of USDC)

            N.B.1 Adding change to cut threshold from 6 to 3 inches [01-20-2022]
            N.B.3.2 Undoing changes after conclusion                [05-13-2022]
        '''
        threshold = float(threshold) #/ 2

        limit = float(limit)

        index_value = data.max().value
        opt_type = opt_type.lower()
        direction = 1 if opt_type == 'call' else -1
        
        payout = (index_value - threshold) * direction
        if payout < 0:
            payout = 0
        if payout > 0:
            payout = limit
        return int(payout * cls._OUTPUT_MULTIPLIER)