FROM ipfs/go-ipfs:v0.7.0

RUN chmod -R +rwx /export
RUN chmod -R +rwx /data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh