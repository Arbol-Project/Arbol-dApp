FROM prom/node-exporter:latest

COPY . /monitor

COPY entrypoint.sh /entrypoint.sh
# RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh