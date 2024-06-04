## Сборка

<pre>
docker build --build-arg DOCKER_USER=skr -t skr:0.1a .
</pre>
Где 0.1a - это версия образа

### Сохранение образа
Для локального сохранения образа:
<pre>
docker save -o containers/skr_0.1a.tar skr:0.1a
</pre>

### Загрузка образа

Копируем образ на веб-сервер:
<pre>
scp "containers/skr_0.1a.tar" a-krasnov@skr.it-serv.ru:/var/tmp/skr_0.1a.tar
</pre>

__Примечание__: параметры подключения к серверу могут быть другими

<pre>
docker load -i /var/tmp/skr_0.1a.tar

docker images
</pre>

## Запуск контейнера
Останавливаем/удаляем предыдущий контейнер (всй зависит от целей):
<pre>
docker container rm -f CONTAINER_ID
</pre>

Запуск контейнера смотреть в файле README.md

## Созранение образа в облаке

__Примечание__: ссылка на на docker - репозиторий может быть любой.

<pre>
docker build --build-arg DOCKER_USER=skr -t docker-registry.mobwal.com/skr:0.1a .
docker push docker-registry.mobwal.com/skr:0.1a
</pre>

или

<pre>
# способ, когда контейнер размещён на docker hub
docker login -u [username]
docker build --build-arg DOCKER_USER=skr -t akrasnov87/skr:0.1a .
docker push akrasnov87/skr:0.1a
</pre>