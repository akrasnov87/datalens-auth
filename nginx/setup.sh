#!/bin/bash

echo "arguments $1 $2 $3"

#sed -i 's+virtual_catalog+'$1'+g' /etc/nginx/sites-available/default

cd /etc/nginx

cp /dev/null upstream.conf

for i in $(seq 1 $3)
do
   c="$(($2 + $i))"
   printf "server 127.0.0.1:$c;\n" >> upstream.conf
done

service nginx start