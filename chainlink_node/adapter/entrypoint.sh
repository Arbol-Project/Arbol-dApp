#!/bin/sh
# python3 tests/test_adapter.py
gunicorn --worker-class gevent --workers 1 --bind 172.17.0.1:8000 wsgi:app --log-level info