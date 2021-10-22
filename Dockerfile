FROM python:3.9
COPY . /app
WORKDIR /app
RUN pip3 install --upgrade pip
RUN pip3 install pipenv
RUN pipenv install --system --deploy --ignore-pipfile
ENTRYPOINT [ "python" ]
CMD [ "app.py" ]
