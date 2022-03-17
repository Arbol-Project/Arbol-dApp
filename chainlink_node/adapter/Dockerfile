FROM python:3.9

COPY . /adapter
WORKDIR /adapter

RUN pip3 install pipenv
RUN pipenv install --system --deploy --ignore-pipfile
RUN pip3 install gunicorn[gevent]
# RUN python3 utils/preload_adapter.py

ENTRYPOINT [ "gunicorn", "--worker-class", "gevent", "--workers", "2", "--bind", "172.17.0.8:8000", "wsgi:app", "--log-level info" ]