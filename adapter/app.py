from flask import Flask, request, jsonify

from adapter import Adapter


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
    adapter = Adapter(data)
    return jsonify(adapter.result)
    
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port='8000', threaded=True)
