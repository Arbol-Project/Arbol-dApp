#!/bin/sh

gunicorn --worker-class --workers 2 gevent --bind 172.17.0.1:8000 wsgi:app --log-level info