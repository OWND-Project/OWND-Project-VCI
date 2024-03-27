#!/bin/bash
source /root/.bashrc
. ~/.nvm/nvm.sh
nvm use 18
pm2 delete all
