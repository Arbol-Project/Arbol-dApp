from program_catalog.programs.cambodia_rainfall import RainfallDerivative
from program_catalog.programs.cuban_blizzard import CriticalSnowfallDerivative


_PROGRAM_DIRECTORY = {
    'rainfall_derivative': {
        'names': ['GRP', 'XSR'],
        'program': RainfallDerivative
    },
    'critical_snowfall_derivative': {
        'names': ['CriticalSnowday'],
        'program': CriticalSnowfallDerivative
    }
}


def get_program(program_name):
    ''' Maps program names to Program classes

        Parameters: program name (str), name of the program
        Returns: Program, class pointer for desired program
        or None if program name is improperly specified
    '''
    for program in _PROGRAM_DIRECTORY:
        if program_name in _PROGRAM_DIRECTORY[program]['names']:
            return _PROGRAM_DIRECTORY[program]['program']
    return None
