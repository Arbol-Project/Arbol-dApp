#!/bin/sh

sudo yum install git
sudo amazon-linux-extras install -y docker
sudo systemctl start docker
sudo gpasswd -a $USER docker
mkdir -p ~/.docker/cli-plugins/
sudo curl -L https://github.com/docker/compose/releases/download/v2.1.1/docker-compose-$(uname -s)-$(uname -m) -o ~/.docker/cli-plugins/docker-compose
sudo chmod +x ~/.docker/cli-plugins/docker-compose
exit