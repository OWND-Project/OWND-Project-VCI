#!/bin/bash
source /root/.bashrc
nvm use 18

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^identity ]]; then
cd /srv/proxy-vci/
pm2 start "yarn start" --name identity-vci
fi

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^event ]]; then
cd /srv/participation-cert-vci/
pm2 start "yarn start" --name event-vci
fi

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^employee ]]; then
cd /srv/employee-vci/
pm2 start "yarn start" --name employee-vci
fi
