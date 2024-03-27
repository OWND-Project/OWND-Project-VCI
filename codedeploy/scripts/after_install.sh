#!/bin/bash
source /root/.bashrc
nvm use 18

cd /srv/common
yarn install
yarn build

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^identity ]]; then
cd /srv/proxy-vci/
pwd
fi

# Todo event用vciのディレクトリが決まったらパスを変える
if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^event ]]; then
cd /srv/participation-cert-vci/
pwd
fi

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^employee ]]; then
cd /srv/employee-vci/
pwd
fi

yarn install
yarn build