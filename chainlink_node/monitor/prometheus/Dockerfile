FROM prom/prometheus:latest

COPY . /monitoring

# ARG password
# ARG auth
# ENV PROMETHEUS_PASSWORD=$password
# ENV PROMETHEUS_AUTH=$auth

ENTRYPOINT ["prometheus", "--config.file=/monitoring/prometheus.yml", "--web.config.file=/monitoring/prometheusweb.yml"]