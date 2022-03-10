#!/bin/sh

ipfs init
ipfs bootstrap rm --all
ipfs bootstrap add '/ip4/198.211.104.50/tcp/4001/p2p/QmWsAFSDajELyneR7LkMsgfaRk2ib1y3SEU7nQuXSNPsQV'
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs daemon
