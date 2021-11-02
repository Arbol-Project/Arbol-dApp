FROM smartcontract/chainlink:0.10.14

RUN mkdir /chainlink
RUN mkdir /chainlink/tls
WORKDIR /chainlink
COPY tls /tls
COPY .api /.api
RUN chmod +x /.api
COPY .password /.password
RUN chmod +x /.password
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh
