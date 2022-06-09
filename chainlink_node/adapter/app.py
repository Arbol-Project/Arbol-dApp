from flask import Flask, request, jsonify

from adapterV1 import ArbolAdapterV1
from adapter import ArbolAdapter
from api import dClimateAdapter


def build_app():

    app = Flask(__name__)

    @app.before_request
    def log_request_info():
        ''' Write header and body info of request to logger '''
        app.logger.debug('Headers: %s', request.headers)
        app.logger.debug('Body: %s', request.get_data())

    @app.route('/', methods=['POST'])
    def call_nft_adapter():
        ''' Primary route for NFT evaluation requests '''
        data = request.get_json()
        if data == '':
            data = {}
        response = ArbolAdapter(data)
        return jsonify(response.result)

    @app.route('/v1', methods=['POST'])
    def call_v1_adapter():
        ''' Primary route for V1 requests to the adapter '''
        data = request.get_json()
        if data == '':
            data = {}
        response = ArbolAdapterV1(data)
        return jsonify(response.result)    

    @app.route('/api', methods=['POST'])
    def call_api_adapter():
        ''' Primary route for dClimate API requests '''
        data = request.get_json()
        if data == '':
            data = {}
        response = dClimateAdapter(data)
        return jsonify(response.result)
    
    @app.route('/health', methods=['POST'])
    def health_check():
        ''' Simple health check route '''
        healthy = {
            'result': "healthy",
            'statusCode': 200,
        }
        return jsonify(healthy)


        

    return app

if __name__ == '__main__':
    app = build_app()
    app.run(debug=True, host='0.0.0.0', port='8000', threaded=True)