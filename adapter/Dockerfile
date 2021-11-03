FROM python:3.8

COPY . /adapter
WORKDIR /adapter
RUN pip3 install pipenv
RUN pipenv install --system --deploy --ignore-pipfile
# ENTRYPOINT ["python3"]
# CMD ["app.py"]
RUN pip install gunicorn
COPY wsgi.py /wsgi.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh