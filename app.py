from flask import Flask, request, jsonify
from redis import Redis

from adapter import Adapter

app = Flask(__name__)
redis = Redis(host='redis', port=6379)


@app.before_request
def log_request_info():
    app.logger.debug('Headers: %s', request.headers)
    app.logger.debug('Body: %s', request.get_data())


@app.route('/', methods=['POST'])
def call_adapter():
    data = request.get_json()
    if data == '':
        data = {}
    adapter = Adapter(data)
    return jsonify(adapter.result)


if __name__ == '__main__':
    app.run(debug=True, host='localhost', port='8000', threaded=True)
