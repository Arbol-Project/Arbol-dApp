from flask import Flask, request, jsonify

from adapter import Adapter
from api import API


def build_app():

    app = Flask(__name__)

    @app.before_request
    def log_request_info():
        ''' Write header and body info of request to logger '''
        app.logger.debug('Headers: %s', request.headers)
        app.logger.debug('Body: %s', request.get_data())

    @app.route('/', methods=['POST'])
    def call_adapter():
        ''' Primary route for requests to the adapter '''
        data = request.get_json()
        if data == '':
            data = {}
        response = Adapter(data)
        return jsonify(response.result)    

    @app.route('/api', methods=['POST'])
    def call_api():
        ''' Primary route for dClimate API requests to the adapter '''
        data = request.get_json()
        if data == '':
            data = {}
        response = API(data)
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