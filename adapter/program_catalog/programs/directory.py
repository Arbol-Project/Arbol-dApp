from program_catalog.programs.rainfall_derivative import RainfallDerivative
from program_catalog.programs.critical_snowfall_derivative import CriticalSnowfallDerivative


def get_program(program_name):
    ''' Maps program names to Program classes

        Parameters: program_name (str), name of the program
        Returns: Program, class pointer for desired program
        or None if program_name is improperly specified
    '''
    program_directory = {
    'rainfall_derivative': {
        'names': ['GRP', 'XSR'],
        'program': RainfallDerivative
        },
    'critical_snowfall_derivative': {
        'names': ['CriticalSnowday'],
        'program': CriticalSnowfallDerivative
        }
    }
    for program_key in program_directory:
        if program_name in program_directory[program_key]['names']:
            return program_directory[program_key]['program']
    return None