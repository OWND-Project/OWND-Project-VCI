#!/bin/bash
source /root/.bashrc
nvm use 18

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^identity ]]; then
cd /srv/demos/proxy-vci/ || exit
pwd
fi

# Todo event用vciのディレクトリが決まったらパスを変える
if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^event ]]; then
cd /srv/demos/event-certificate-manager/backend|| exit
git clone https://github.com/OWND-Project/OWND-Project-VCI.git
cd ./OWND-Project-VCI || exit
yarn
yarn build
cd /srv/backend || exit
yarn
pwd
fi

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^employee ]]; then
cd /srv/demos/employee-vci/ || exit
pwd
fi

yarn install
yarn build