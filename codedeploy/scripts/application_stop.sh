#!/bin/bash
source /root/.bashrc
. ~/.nvm/nvm.sh
nvm use 18
# pm2のプロセスが存在するか確認
if pm2 list | grep -qE "backend"; then
    pm2 delete all
fi
