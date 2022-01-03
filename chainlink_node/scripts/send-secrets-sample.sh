#!/bin/sh
# need to set EC2 address
cd chainlink_node/chainlink/secrets
zip -r secrets.zip .
scp -i "~/.ssh/ChainlinkAccessKey.cer" secrets.zip ec2-user@ec2-1-2-3-4.compute-1.amazonaws.com:~/Arbol-dApp/chainlink_node/chainlink
mv secrets.zip ../secrets.zip
cd ../../../smart_contracts/hardhat
zip -r SROs.zip SROs
scp -i "~/.ssh/ChainlinkAccessKey.cer" SROs.zip ec2-user@ec2-1-2-3-4.compute-1.amazonaws.com:~/Arbol-dApp/smart_contracts/hardhat
cd ../..