## Описание

### Быстрый запуск
<pre>
docker compose -p dev --env-file ./.env.dev up -d
</pre>

- .env.dev - для стенда разработки
- .env.test - для внутреннего тестового стенда 

__Примечание__: для удаления и остановки контейнер использовать команду `docker compose -p dev --env-file ./.env.dev down`

#### Описание настроек
- UI_PORT=7000 - внешний порт
- APP_ENV="dev" - режим сборки, требуется наличие файла в папке `app/*.conf`
- NODE_VPATH="/dev/" - виртуальный каталог
- STORAGE_PATH="./storage" - путь для хранения файлов, по умолчанию текущий каталог, но лучше хранить на специальном диске. Нужно убедиться, что есть права на запись, лучше `777` поставить.
- FILES_PATH="./files" - путь к файлам, где хранятся временные данные после синхронизации;
- DATALENS_URL="http://localhost:8080" - подключение к datalens (пока не используется)
- NODE_THREAD=2 - количество потоков внутри контейнера
- VERSION_CONTAINER="1.0.5" - версия контейнера
- SITE="https://skr.it-serv.ru" - корневой адрес сайта
- WSDL_PATH="./wsdl" - путь к файла для интеграции с Пирамида 2.0

#### Запуск нескольких сред
Для запуск нескольких сред с разной конфигурацией требуется использовать имя проекта (-p)
<pre>
docker compose -p dev --env-file ./.env.dev up -d

docker compose -p test --env-file ./.env.test up -d
</pre>

Первая команда создаёт проект `dev`, а второй `test` при этом они были запущены из одного каталога.

Для указания определённого *.yml файла рекомендуется передавать параметр `-f`, например:
<pre>
docker compose -p dev -f docker-compose-dev.yml --env-file ./.env.dev up -d
</pre>

Тут запукается `docker-compose-dev.yml` с именем проекта `dev`

#### О контейнерах
- akrasnov87/skr:1.0 - хранится на [`docker hub`](https://hub.docker.com/repository/docker/akrasnov87/skr/general), можно заменить своим собрав командой `docker build --build-arg DOCKER_USER=skr -t akrasnov87/skr:1.0 .`

__Примечание__: `akrasnov87` - это мой логин на `docker hub`, локально можно собрать под любым именем.

### Общее

Контейнер для серверной части проекта СКР РусГидро.

Исходный код для <code>app</code> хранится тут http://git/skr/skr-rpc-service

__Примечание__: после первичной загрузки выполнить `git submodule update --init --recursive` и `npm install` для каталога `app`

<pre>
docker container rm -f skr-rpc-dev && docker run -d -e CONF="dev" -e NODE_VPATH="/dev/" --user skr --name skr-rpc-dev --restart unless-stopped -p 7000:5000 -h skr -v /var/www/skr-files/dev:/app/storage:rw skr:0.1a
</pre>

__Внимание__: для нормальной работы с очередями требуется выполнить установки контейнера `rabbitmg`
<pre>
docker run -d --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management
</pre>

### Версионность
Например: 0.1a

Конечная буква обозначает:
* a - альфа (версия для разработки)
* b - бета (версия для внутреннего тестирования)
* rc - релиз-кандидат (версия для тестирования на стендах заказчика)
* r - релизная версия

## Создание образа
<pre>
docker build --build-arg DOCKER_USER=skr -t skr:0.1a .
</pre>

Где 0.1a - это информация о версии сборки, которая может быть другой

## Запуск контейнера
Перед запуском требуется убедиться, что есть каталог `/var/www/skr-files/dev` и предыдущий контейнер остановлен (docker container rm -f CONTAINER_ID).

___Примечание___: каталог для хранения внешних данных может быть любым, главное он должен быть создан и у него должны быть соотвествующие права.

<pre>
docker run -d -e CONF="dev" --user skr --name skr-rpc-dev --restart unless-stopped -p 7000:5000 -h skr -v /var/www/skr-files/dev:/app/storage:rw skr:0.1a
</pre>

Где:
* первый порт это - внешний, второй - это внутренний в контейнере;
* параметр `--user` предназначен для прокидывания локального пользователя `skr`, номер можно узнать `cat /etc/passwd | grep skr`;
* `/var/www/skr-files/dev` - путь для хранения данных (может быть любым).

Параметр `-d` нужен, чтобы не блокировать консоль, а запустить приложение в фоне.

___Примечание___: дополнительно в контейнере по пути `/app/files` храняться временные данные, которые периодически очищаются

Для просмотра логов контейнера вызвать:
<pre>
docker logs -f skr-rpc-dev
</pre>

### Запуск в режиме редактирования

Для отладки будет удобен способ, при котором контейнер за файлами будет обращатся в папку сервера:

<pre>
docker container rm -f skr-rpc-dev && docker run -d -e CONF="dev" --user skr --name skr-rpc-dev --restart unless-stopped -p 7000:5000 -h skr -v /var/www/skr-backend-app-dev:/app:rw skr:0.4a-11
</pre>

В данном примере указано, что все исполняемые файлы хранятся в каталоге `/var/www/skr-backend-app-dev` и они подменяются в контейнере `/app`

### Пользователь
При запуске контейнера убедиться, что есть пользователь `skr`
<pre>
cat /etc/passwd | grep "skr"
</pre>

Если пользователья нет, то создаём `sudo useradd skr` и добавляем в группу `sudo usermod -aG skr skr`
И назначаем права на каталог `/var/www/skr-files`:
<pre>
chown -R skr:skr /var/www/skr-files
chmod -R 770 /var/www/skr-files
</pre>

### Параметры
* CONF - тип конфигурации, release, dev, test
* NODE_VPATH - виртуальный путь, можно не указывать, по умолчанию берётся из `CONF`
* NODE_PORT - порт
* NODE_DEBUG - режим отладки, если нужно передать, как true
* NODE_THREAD - количество потоков
* CONNECT_STR - строка подключения к БД
* RABBIT_CONNECT - строка подключения к rabbit-mq
* VERSION_CONTAINER - версия контейнера skr RPC

### Запуск локально

Предварительно требуется убедиться в наличии хранилища `skr-storage`
<pre>
docker volume ls
docker volume inspect skr-storage
# если хранилища нет
docker volume create skr-storage
</pre>

<pre>
docker run -d -e CONF="dev" -e NODE_VPATH="/dev/" -e CONNECT_STR="host:host.docker.internal;port:5432;user:skrmo-node;password:r8qVbNK~;database:skr-dev-db" --user skr --name skr-rpc-dev --restart unless-stopped -p 7000:5000 -h skr -v skr-storage:/app/storage:rw skr:0.1a
</pre>

## Установка docker на Ubuntu
Описание по ссылке https://docs.docker.com/engine/install/ubuntu

<pre>
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg
</pre>

<pre>
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
</pre>

<pre>
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
</pre>

<pre>
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
</pre>

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
docker build --build-arg DOCKER_USER=skr -t akrasnov87/skr:1.0 .
docker push akrasnov87/skr:1.0
</pre>

Получение образа:
<pre>
docker pull akrasnov87/skr:1.0
</pre>

## Как передать переменные

Лучше создать в корне проекта файл .env и записать туда следующие параметры:
<pre>
UI_PORT=7000
APP_ENV="dev"
NODE_VPATH="/dev/"
STORAGE_PATH="./"
DATALENS_URL="http://localhost:8080"
CONNECT_STR="host:192.168.17.46;port:5432;user:skrmo-node;password:r8qVbNK~;database:skr-dev-db"
NODE_THREAD=2
VERSION_CONTAINER="1.0.5"
</pre>

Для запуска выполнить `docker compose --env-file ./.env up`

## Встроенные приложения

### rabbit-mq

Для доступа к UI интерфейсу требуется ввести `/apps/rabbit/` (ВНИМАНИЕ!!! вконце слэш __обязателен__). 

При запросе логина и пароля ввести значения:
* `quest` 
* `quest` 

https://www.rabbitmq.com/docs/access-control

### pgadmin4

Для доступа к UI интерфейсу требуется ввести `/apps/pgadmin4`. 

При запросе логина и пароля ввести значение:
* pgadmin4@skr.com
* guest-skr-com

https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html

### Обновление и загрузка вложенных проектов

`git submodule update --init --remote --recursive`