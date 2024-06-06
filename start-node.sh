# путь к конфигурационному файлу для изменений
CONFIG_PATH="/app/$APP_ENV.conf"
DEFAULT_CONFIG_PATH="/app/default.conf"

if [ -n "$NODE_VPATH" ]; then
    sed -i 's+virtual_dir_path="/\w*/"+virtual_dir_path="'"$NODE_VPATH"'"+g' $CONFIG_PATH
else
    sed -i 's+virtual_dir_path="/\w*/"+virtual_dir_path="/'"$APP_ENV"'/"+g' $CONFIG_PATH
fi

sed -i 's+application_name="datalens-auth-\w*-node"+application_name="datalens-auth-'"$APP_ENV"'-node"+g' $CONFIG_PATH

if [ -n "$PROJECT_ID" ]; then
    sed -i 's+application_name=.*+application_name="'"$PROJECT_ID"'"+g' $CONFIG_PATH
fi

if [ -n "$CONNECT_STR" ]; then
    sed -i 's+connection_string=.*+connection_string="'"$CONNECT_STR"'"+g' $CONFIG_PATH
fi

if [ -n "$NODE_PORT" ]; then
    sed -i 's+port=[0-9]*+port='$NODE_PORT'+g' $CONFIG_PATH
fi

if [ -n "$NODE_DEBUG" ]; then  
    sed -i 's+debug=\w*+debug='"$NODE_DEBUG"'+g' $CONFIG_PATH
fi

if [ -n "$NODE_THREAD" ]; then  
    sed -i 's+node_thread=[0-9]*+node_thread='$NODE_THREAD'+g' $CONFIG_PATH
fi

echo "/bin/bash /etc/nginx/setup.sh $APP_ENV 5000 $NODE_THREAD"

/bin/bash /etc/nginx/setup.sh $APP_ENV 5000 $NODE_THREAD

cat /etc/nginx/upstream.conf
echo ""
echo ""

cat /etc/nginx/sites-available/default
echo ""
echo ""

cat $CONFIG_PATH
echo ""
echo ""

# запуск конфигурации
/usr/bin/node /app/bin/www "conf=$CONFIG_PATH" "version_container=$VERSION_CONTAINER"