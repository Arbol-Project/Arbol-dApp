FROM ipfs/go-ipfs:v0.7.0

RUN mkdir /export
RUN mkdir /data
RUN mkdir /data/ipfs

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh