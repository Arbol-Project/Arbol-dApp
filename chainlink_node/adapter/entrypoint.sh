#!/bin/sh

gunicorn --worker-class gevent --bind 172.17.0.1:8000 wsgi:app --log-level info