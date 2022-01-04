#!/bin/sh

sudo amazon-linux-extras install -y docker
sudo systemctl start docker
sudo gpasswd -a $USER docker
mkdir -p ~/.docker/cli-plugins/
sudo curl -L https://github.com/docker/compose/releases/download/v2.1.1/docker-compose-$(uname -s)-$(uname -m) -o ~/.docker/cli-plugins/docker-compose
sudo chmod +x ~/.docker/cli-plugins/docker-compose

# sudo amazon-linux-extras install -y epel
# sudo tee /etc/yum.repos.d/pgdg.repo<<EOF
# [pgdg13]
# name=PostgreSQL 13 for RHEL/CentOS 7 - x86_64
# baseurl=http://download.postgresql.org/pub/repos/yum/13/redhat/rhel-7-x86_64
# enabled=1
# gpgcheck=0
# EOF
# sudo yum install postgresql13 postgresql13-server -y
# sudo /usr/pgsql-13/bin/postgresql-13-setup initdb
# sudo systemctl enable --now postgresql-13
