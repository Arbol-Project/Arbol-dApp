FROM smartcontract/chainlink:1.1.0

# RUN mkdir /chainlink
# RUN mkdir /chainlink/tls
# WORKDIR /chainlink

COPY tls /tls
COPY .api /.api
RUN chmod +x /.api
COPY .password /.password
RUN chmod +x /.password

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# ENTRYPOINT /entrypoint.sh
ENTRYPOINT [ "chainlink",  "local", "node", "-p", "/.password", "-a", "/.api" ]
