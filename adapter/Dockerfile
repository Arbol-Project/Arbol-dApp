FROM python:3.8

COPY . /adapter
WORKDIR /adapter

RUN pip install --upgrade --user pip
RUN pip install --user pipenv
RUN pipenv install --system --deploy --ignore-pipfile
RUN pip install --user gunicorn[gevent]
COPY wsgi.py /wsgi.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh