import pandas as pd

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
    def loader(cls):
        pass

    @classmethod
    def serve_contract(cls, start, end, lat, lon, strike, exhaust, limit, option_type):
        # these parameters have no effect on the fake contract class
        return Contract(start=start, end=end, lat=lat, lon=lon, strike=strike,
            exhaust=exhaust, limit=limit, opt_type=option_type)

    @classmethod
    def serve_contract_from_sro(cls, sro):
        # for stub just return contract
        return Contract()

    @classmethod
    def serve_evaluation(cls, contract):
        ''' For most programs, this does involved breakdowns of the contract index values.
        For this program, just return the evaluation year and payout '''
        series = contract.evaluate()
        payout_idx = series.index[-1]
        payout_val = series.iloc[-1]
        return {
            "contract_year": payout_idx,
            "payout": payout_val
        }
