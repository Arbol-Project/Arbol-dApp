FROM ipfs/go-ipfs:v0.7.0

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# RUN ipfs init
# RUN ipfs bootstrap rm --all
# RUN ipfs bootstrap add '/ip4/198.211.104.50/tcp/4001/p2p/QmWsAFSDajELyneR7LkMsgfaRk2ib1y3SEU7nQuXSNPsQV'
ENTRYPOINT /entrypoint.sh