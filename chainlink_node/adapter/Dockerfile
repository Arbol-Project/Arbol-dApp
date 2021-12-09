FROM python:3.8

COPY . /adapter
WORKDIR /adapter
RUN pip3 install pipenv
RUN pipenv install --system --deploy --ignore-pipfile
RUN pip3 install gunicorn[gevent]
COPY wsgi.py /wsgi.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh