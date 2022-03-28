FROM smartcontract/chainlink:1.2.1

COPY tls /tls
COPY .api /.api
RUN chmod +x /.api
COPY .password /.password
RUN chmod +x /.password

ENTRYPOINT [ "chainlink",  "local", "node", "-p", "/.password", "-a", "/.api" ]
