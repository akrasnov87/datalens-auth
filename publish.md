## Сборка

<pre>
# способ, когда контейнер размещён на docker hub
docker login -u [username]
docker build --build-arg DOCKER_USER=dl -t akrasnov87/datalens-auth:0.1.0 .
docker push akrasnov87/akrasnov87/datalens-auth:0.1.0
</pre>