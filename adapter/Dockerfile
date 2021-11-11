FROM python:3.8
# FROM 080949671823.dkr.ecr.us-east-1.amazonaws.com/external-adapter:latest

COPY . /adapter
WORKDIR /adapter
RUN pip3 install pipenv
RUN pipenv install --system --deploy --ignore-pipfile
RUN pip install gunicorn[gevent]
COPY wsgi.py /wsgi.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh