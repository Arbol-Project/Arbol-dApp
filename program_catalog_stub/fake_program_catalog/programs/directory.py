from program_catalog_stub.fake_program_catalog.programs.cambodia_rainfall import CambodiaRainfall

_PROGRAM_DIRECTORY = {'cambodia_rainfall': CambodiaRainfall}

def get_program(program_name):
    return _PROGRAM_DIRECTORY[program_name]
