import pandas as pd
from program_catalog_stub.fake_program_catalog.programs.program_utils.dweather_loaders import GridcellLoader

class Contract:
    ''' Stub contract class '''
    def __init__(self, **kwargs):
        pass

    def evaluate(self):
        ''' always return the same payout series '''
        ser = pd.Series([3032.00], index=[2021])
        ser.index.name = "contract_year"
        return ser


class CambodiaRainfall:
    ''' Stub Rainfall program '''

    @classmethod
    def serve_contract(cls, lat, lon, dataset, optional_params, task_params):
        loader = GridcellLoader(lat=lat, lon=lon, dataset_name=dataset, optional_params=optional_params)
        # these parameters have no effect on the fake contract class
        return {'status': 'contract served', 'lat': lat, 'lon': lon, 'dataset': dataset, 'params': task_params}

    @classmethod
    def serve_contract_from_sro(cls, sro):
        # for stub just return contract
        return {'status': 'contract served', 'sro': sro}

    @classmethod
    def serve_evaluation(cls, **kwargs):#, contract):
        # parameters modified for testing while stubbed
        ''' For most programs, this does involved breakdowns of the contract index values.
        For this program, just return the evaluation year and payout '''
        contract = Contract()
        series = contract.evaluate()
        payout_idx = series.index[-1]
        payout_val = series.iloc[-1]
        return {"contract_year": int(payout_idx), "payout": payout_val}
