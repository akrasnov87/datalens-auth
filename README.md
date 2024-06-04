## Описание

### Быстрый запуск
<pre>
docker run --rm -it --env-file ./.env.dev -p 7000:80 akrasnov87/datalens-auth:0.1.0
</pre>

#### Описание настроек файла *.env
- APP_ENV="dev" - режим сборки, требуется наличие файла в папке `app/*.conf`

Пример файла *.conf
<pre>
virtual_dir_path="/dev/"
debug=true
port=5000
node_thread=2
connection_string="host:server;port:5432;user:root;password:secret;database:database-name"
application_name="datalens-auth-dev"
</pre>

- NODE_VPATH="/dev/" - виртуальный каталог
- NODE_THREAD=2 - количество потоков внутри контейнера
- VERSION_CONTAINER=0.1.0 - версия контейнера
- CONNECT_STR="host:server;port:5432;user:root;password:secret;database:database-name" - подключение к БД

#### О контейнерах
- akrasnov87/datalens-auth:0.1.0- хранится на [`docker hub`](https://hub.docker.com/repository/docker/akrasnov87/datalens-auth/general), можно заменить своим собрав командой `docker build --build-arg DOCKER_USER=dl -t akrasnov87/datalens-auth:0.1.0 .`

__Примечание__: `akrasnov87` - это мой логин на `docker hub`, локально можно собрать под любым именем.

## Настройка NGINX

<pre>
server {
    proxy_connect_timeout       600;
    proxy_send_timeout          600;
    proxy_read_timeout          600;
    send_timeout                600;

    listen 80 default_server;
    listen [::]:80 default_server;
    client_max_body_size 100m;

    location /dev {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:7000/dev;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
</pre>

## Для сохранения в docker-репозитории

По умолчанию храню контейнер в [docker hub](https://hub.docker.com/repository/docker/akrasnov87/skr/general)

<pre>
docker build --build-arg DOCKER_USER=dl -t akrasnov87/datalens-auth:0.1.0 .
docker push akrasnov87/datalens-auth:0.1.0
</pre>

Получение образа:
<pre>
docker pull akrasnov87/datalens-auth:0.1.0
</pre>