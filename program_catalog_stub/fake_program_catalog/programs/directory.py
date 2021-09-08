from program_catalog_stub.fake_program_catalog.programs.cambodia_rainfall import CambodiaRainfall

PROGRAM_DIRECTORY = {'cambodia_rainfall': CambodiaRainfall}

def get_program(program_name):
    return PROGRAM_DIRECTORY[program_name]
