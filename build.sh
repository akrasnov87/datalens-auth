#!/bin/bash

sed -i 's/\r//g' /start-node.sh

# меняем версию NodeJS
/usr/bin/node /change-version.js

rm -rf /app/.git
rm -rf /app/.vscode
rm -rf /app/schema

useradd $DOCKER_USER && usermod -aG $DOCKER_USER $DOCKER_USER
chown -R $DOCKER_USER:$DOCKER_USER /app
chown -R $DOCKER_USER:$DOCKER_USER /home
chmod -R 777 /app
chmod -R 777 /home
chmod -R 777 /var/lib/nginx
chmod -R 777 /run