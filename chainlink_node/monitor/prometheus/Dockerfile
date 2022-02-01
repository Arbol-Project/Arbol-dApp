FROM prom/prometheus:latest

COPY . /monitor

# ARG password
# ARG auth
# ENV PROMETHEUS_PASSWORD=$password
# ENV PROMETHEUS_AUTH=$auth

ENTRYPOINT ["prometheus", "--config.file=/monitor/prometheus.yml", "--web.config.file=/monitor/prometheusweb.yml"]