#!/bin/sh
python3 tests/test_adapter.py
#--workers 5
gunicorn --worker-class gevent --bind 172.17.0.1:8000 wsgi:app --log-level info