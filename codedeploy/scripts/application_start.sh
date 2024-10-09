#!/bin/bash
source /root/.bashrc
nvm use 18

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^identity ]]; then
cd /srv/demos/proxy-vci/ || exit
pm2 start "yarn start" --name backend
fi

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^event ]]; then
cd /srv/demos/event-certificate-manager/ || exit
pm2 start "yarn start" --name backend
fi

if [[ "$DEPLOYMENT_GROUP_NAME" =~ ^employee ]]; then
cd /srv/demos/employee-vci/ || exit
pm2 start "yarn start" --name backend
fi
