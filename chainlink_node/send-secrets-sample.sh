#!/bin/sh

cd chainlink/secrets
zip -r secrets.zip .
scp -i "~/.ssh/ChainlinkAccessKey.cer" secrets.zip ec2-user@ec2-1-2-3-4.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/chainlink
cd ../adapter/tests
zip SROs.zip SROs
scp -i "~/.ssh/ChainlinkAccessKey.cer" SROs.zip ec2-user@ec2-1-2-3-4.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/adapter/tests
cd ../../..