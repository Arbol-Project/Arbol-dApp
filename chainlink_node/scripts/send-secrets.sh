#!/bin/sh

cd chainlink_node/chainlink/secrets
zip -r secrets.zip .
scp -i "~/.ssh/ChainlinkAccessKey.cer" secrets.zip ec2-user@ec2-18-234-236-49.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/chainlink
mv secrets.zip ../secrets.zip
cd ../../adapter/tests
zip -r SROs.zip SROs
scp -i "~/.ssh/ChainlinkAccessKey.cer" SROs.zip ec2-user@ec2-18-234-236-49.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/adapter/tests
cd ../..