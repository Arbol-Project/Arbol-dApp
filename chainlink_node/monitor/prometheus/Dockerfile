FROM prom/prometheus:latest

COPY . /monitor

ENTRYPOINT ["prom/prometheus", "--config.file=/monitor/prometheus.yml", "--web.config.file=/monitor/prometheusweb.yml"]