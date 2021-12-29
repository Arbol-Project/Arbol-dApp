#!/bin/sh
python3 tests/test_adapter.py
gunicorn --worker-class gevent --workers 5 --bind 127.0.0.1:8000 wsgi:app --log-level info