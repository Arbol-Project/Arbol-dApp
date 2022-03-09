FROM smartcontract/chainlink:1.1.0

COPY tls /tls
COPY .api /.api
RUN chmod +x /.api
COPY .password /.password
RUN chmod +x /.password

ENTRYPOINT [ "chainlink",  "local", "node", "-p", "/.password", "-a", "/.api" ]
