from program_catalog_stub.programs.cambodia_rainfall import CambodiaRainfall
from program_catalog_stub.programs.cuban_blizzard import CubanBlizzard


_PROGRAM_DIRECTORY = {
    'cambodia_rainfall': CambodiaRainfall,
    'cuban_blizzard': CubanBlizzard
}


def get_program(program_name):
    ''' Parameters: program name (str), name of the program
        Returns: Program, class pointer for desired program
    '''
    return _PROGRAM_DIRECTORY[program_name]
