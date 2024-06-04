# FROM ubuntu:20.04
FROM docker-registry.mobwal.com/ubuntu:20.04

LABEL author="Aleksandr Krasnov"
LABEL desc="Образ RPC-сервиса для СКРМО"

RUN apt update && apt upgrade -y

ARG DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

COPY setup_18.x.sh /setup_18.x.sh
RUN sed -i 's/\r//g' /setup_18.x.sh
RUN /bin/bash /setup_18.x.sh

RUN apt install nodejs nginx -y

WORKDIR /app
ARG DOCKER_USER=dl
COPY app /app

COPY start-node.sh /start-node.sh
COPY change-version.js /change-version.js
COPY build.sh /build.sh

COPY nginx /etc/nginx
RUN sed -i 's/\r//g' /etc/nginx/setup.sh
RUN chmod -R 777 /var/log
RUN chmod -R 777 /etc/nginx

RUN sed -i 's/\r//g' /build.sh
RUN /bin/bash /build.sh

RUN rm /build.sh
RUN rm /change-version.js

RUN apt-get clean autoclean
RUN apt-get autoremove --yes

ENTRYPOINT [ "/bin/bash" ]
USER $DOCKER_USER
CMD [ "/start-node.sh" ]