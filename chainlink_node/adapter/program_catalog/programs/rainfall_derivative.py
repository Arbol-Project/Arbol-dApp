# from datetime import datetime

from program_catalog.tools.loaders import GridcellLoader


class RainfallDerivative:
    ''' Program class for rainfall contracts. Validates requests,
        retrieves weather data from IPFS, computes an average over the given
        locations, and evaluates whether a payout should be awarded
    '''
    _PROGRAM_PARAMETERS = ['dataset', 'locations', 'start', 'end', 'strike', 'limit', 'opt_type']
    _PARAMETER_OPTIONS = ['exhaust', 'tick']
    _OUTPUT_MULTIPLIER = 10**2


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
        '''
        loader = GridcellLoader(params['locations'],
                                params['dataset'],
                                imperial_units=params.get('imperial_units', False)
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
                        start (str), string for start date of coverage period
                        end (str), string for end date of coverage period
                        opt_type (str), type of option contract, either PUT or CALL
                        strike (str), string of num for strike value for the payout (no floats in solidity)
                        limit (str), string of num for limit value for the payout (no floats in solidity)
                        exhaust (str), string of num for exhaust value for the payout (no floats in solidity)
            or None if tick is not None
                        tick (str), tick value for payout or None if exhaust is not None
            Returns: int, generated payout times 10^8 (in order to report back to chain)
        '''
        print(f'data: {data}')
        print(f'start: {start}')
        print(f'end: {end}')

        strike = float(strike)
        limit = float(limit)

        print(f'strike: {strike}')
        print(f'limit: {limit}')

        index_value = data.loc[start:end].sum()
        opt_type = opt_type.lower()
        direction = 1 if opt_type == 'call' else -1

        print(f'index_value: {index_value}')
        print(f'opt_type: {opt_type}')
        print(f'direction: {direction}')

        print(f'exhaust: {exhaust}')
        print(f'tick: {tick}')
        if tick is not None:
            tick = float(tick)
        else:
            exhaust = float(exhaust)
            tick = abs(limit / (strike - exhaust))
        print(f'exhaust: {exhaust}')
        print(f'tick: {tick}')

        payout = (index_value - strike) * tick * direction
        print(f'payout: {payout}')
        if payout < 0:
            payout = 0
        if payout > limit:
            payout = limit
        print(f'result: {int(float(round(payout, 2)) * cls._OUTPUT_MULTIPLIER)}')
        return int(float(round(payout, 2)) * cls._OUTPUT_MULTIPLIER)
