#!/bin/sh

zip -r chainlink_node/chainlink/secrets.zip chainlink_node/chainlink/secrets
scp -i "~/.ssh/ChainlinkAccessKey.cer" chainlink_node/chainlink/secrets.zip ec2-user@ec2-1-2-3-4.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/chainlink
zip chainlink_node/adapter/tests/SROs.zip chainlink_node/adapter/tests/SROs
scp -i "~/.ssh/ChainlinkAccessKey.cer" chainlink_node/adapter/tests/SROs.zip ec2-user@ec2-1-2-3-4.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/adapter/tests