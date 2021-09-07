from fake_program_catalog.programs.cambodia_rainfall import CambodiaRainfall

if __name__ == "__main__":

    # Get a contract from the terms
    contract = CambodiaRainfall.serve_contract(
        start="2021-08-01",
        end="2021-08-31",
        lat=100.0,
        lon=-95.0,
        strike=0.5,
        exhaust=0.25,
        limit=1000,
        option_type="PUT"
    )

    # or, optionally load a contract from an SRO
    ''' 
    sro = database.load(contract_id="ABC123")
    contract = CambodiaRainfall.serve_contract_from_sro(sro)
    '''

    # Evaluate the contract
    print('Evaluating contract')
    print(CambodiaRainfall.serve_evaluation(contract))