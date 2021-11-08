#!/bin/sh

gunicorn --worker-class gevent --workers=2 --bind 172.17.0.1:8000 wsgi:app --log-level info