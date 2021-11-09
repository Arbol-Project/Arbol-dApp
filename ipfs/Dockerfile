# FROM ipfs/go-ipfs:v0.7.0
FROM 080949671823.dkr.ecr.us-east-1.amazonaws.com/ipfs-daemon:latest

# RUN ipfs init
RUN ipfs bootstrap rm --all
RUN ipfs bootstrap add '/ip4/198.211.104.50/tcp/4001/p2p/QmWsAFSDajELyneR7LkMsgfaRk2ib1y3SEU7nQuXSNPsQV'
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT /entrypoint.sh