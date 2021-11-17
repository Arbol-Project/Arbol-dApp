#!/bin/sh
#172.17.0.1
gunicorn --worker-class gevent --workers 2 --bind 0.0.0.0:8000 wsgi:app --log-level info