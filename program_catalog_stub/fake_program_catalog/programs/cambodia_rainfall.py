import pandas as pd

from program_catalog_stub.fake_program_catalog.program_utils.loader import CambodiaRainfallLoader


def risk_eval(history, **contract_params):
    ''' placeholder component '''
    return '$$$', 'XXX'


class Contract:
    ''' Stub contract class '''
    def __init__(self, **kwargs):
        pass

    def evaluate(self):
        ''' always return the same payout series '''
        ser = pd.Series([3032.00], index=[2021])
        ser.index.name = 'contract_year'
        return ser


class Program:
    ''' Stub Program Base Class '''
    @classmethod
    def serve_contract(cls, **kwargs):
        pass

    @classmethod
    def serve_evaluation(cls, **kwargs):
        pass


class CambodiaRainfall(Program):
    ''' Stub Rainfall program '''
    @classmethod
    def serve_contract(cls, locations, dataset, contract_params):
        loader = CambodiaRainfallLoader(locations=locations, dataset_name=dataset)
        avg_history = loader.load()
        payout, index = risk_eval(avg_history, **contract_params)
        return {'status': 'contract served', 'locations': locations, 'dataset': dataset, 'params': contract_params, 'payout': payout, 'index': index}

    @classmethod
    def serve_evaluation(cls, **kwargs):
        ''' For most programs, this does involved breakdowns of the contract index values.
        For this program, just return the evaluation year and payout '''
        contract = Contract()
        series = contract.evaluate()
        payout_idx = series.index[-1]
        payout_val = series.iloc[-1]
        return {'status': 'contract evaluated', 'contract_year': int(payout_idx), 'payout': payout_val}
