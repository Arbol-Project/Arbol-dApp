from programs.rainfall_derivative import RainfallDerivative
from programs.critical_snowfall_derivative import CriticalSnowfallDerivative


def get_program(params):
    ''' Maps program names to Program classes

        Parameters: params (dict), parameters for adapter request
        Returns: Program, class pointer for desired program
        or None if params is improperly specified
    '''
    if 'locations' in params:
        return RainfallDerivative
    elif 'dates' in params:
        return CriticalSnowfallDerivative
    return None