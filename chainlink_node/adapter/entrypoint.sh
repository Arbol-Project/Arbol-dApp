#!/bin/sh
# python3 utils/preload_adapter.py
gunicorn --worker-class gevent --workers 1 --bind 127.0.0.1:8000 wsgi:app --log-level info
