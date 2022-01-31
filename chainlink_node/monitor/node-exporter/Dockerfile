FROM prom/node-exporter:latest

COPY . /monitor

ENTRYPOINT ["prom/node-exporter", "--path.rootfs=/monitor", "--web.config=/monitor/exporterweb.yml"]