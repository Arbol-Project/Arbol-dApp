from program_catalog.program_utils.loader import ArbolLoader


_REQUIRED_PARAMETERS = ['dataset', 'locations', 'start', 'end', 'strike', 'exhaust', 'limit', 'opt_type']

def _generate_payouts(data, start, end, opt_type, strike, exhaust, limit):
    ''' Uses the provided contract parameters to calculate a payout and index

        Parameters: data (Pandas Series), weather data averaged over locations
                    start (date str), start date of coverage period
                    end (date str), end date of coverage period
                    opt_type (str), type of option contract, either PUT or CALL
                    strike (number), strike value for the contract
                    exhaust (number), exhaust value for the contract
                    limit (number), limit value for the payout
        Returns: number, generated payout
    '''
    index_value = data.loc[start:end].sum()
    opt_type = opt_type.lower()
    direction = 1 if opt_type == 'call' else -1
    tick = abs(limit / (strike - exhaust))
    payout = (index_value - strike) * tick * direction
    if payout < 0:
        payout = 0
    if payout > limit:
        payout = limit
    return round(payout, 2)


class CubanBlizzard:
    ''' Program class for Cuban/Mavs blizzard contracts. Validates requests,
        retrieves weather data from IPFS, computes an average over the given
        locations, and evaluates whether a payout should be awarded
    '''
    @classmethod
    def validate_request(cls, params):
        ''' Uses program-specific parameter requirements to validate a given
            request

            Parameters: params (dict), parameters to be checked against the
            requirements
            Returns: bool, whether the request format is valid
                     str, error message in the event that the request is not valid
        '''
        result = True
        result_msg = ''
        for param in _REQUIRED_PARAMETERS:
            if not param in params:
                result_msg += f'missing {param} parameter\n'
                result = False
        return result, result_msg

    @classmethod
    def serve_evaluation(cls, params):
        ''' Loads the relevant geospatial historical weather data and computes
            a payout and an index

            Parameters: params (dict), dictionary of required contract parameters
            Returns: number, the determined payout (0 if not awarded)
        '''
        loader = ArbolLoader(locations=params['locations'],
                            dataset_name=params['dataset'],
                            imperial_units=params.get('imperial_units', False)
                            )
        avg_history = loader.load()
        payout = _generate_payouts(data=avg_history,
                                    start=params['start'],
                                    end=params['end'],
                                    opt_type=params['opt_type'],
                                    strike=params['strike'],
                                    exhaust=params['exhaust'],
                                    limit=params['limit']
                                    )
        return payout
