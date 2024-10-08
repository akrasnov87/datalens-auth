## Описание

Компонент системы для подключения авторизации к `datalens`.

__Внимание__: корректность работы проверяется и разрабатывается только для `PostgreSQL`. Для других БД могут быть проблемы с совместимостью, но этот риск минимален.

### Быстрый запуск
<pre>
docker run --rm -it --env-file ./.env.demo -p 7000:80 akrasnov87/datalens-auth:0.1.0
</pre>

Примечание: по умолчанию сервис смотрит на БД, которая доступна вне сети контейнера (прокинут порт 5432)

`postgres://us:us@host.docker.internal:5432/us-db-ci_purgeable`

__Внимание__: сервис будет запущен только в тогда, когда в таблице `core.pd_users` есть записи

#### Описание настроек файла *.env
- APP_ENV="demo" - режим сборки, требуется наличие файла в папке `app/*.conf`

Пример файла *.conf
<pre>
virtual_dir_path="/demo/"
debug=true
port=5000
node_thread=2
connection_string="postgres://user:password@server:5432/database-name"
application_name="datalens-demo"
source_types='.PG_TABLE.'
auth_key_mode=false
</pre>

- NODE_VPATH="/demo/" - виртуальный каталог
- NODE_THREAD=2 - количество потоков внутри контейнера
- VERSION_CONTAINER=0.1.0 - версия контейнера (информационное поле)
- CONNECT_STR="postgres://user:password@server:5432/database-name" - подключение к БД
- PROJECT_ID=datalens-demo - наименование проекта в public.workbooks и public.collections  (project_id)
- SOURCE_TYPES=".PG_TABLE." - имя источника для проверки доступности таблиц
- AUTH_KEY_MODE=false - режим авторизации по ключу, по умолчанию должно быть false

В системе предусмотрена использование двух форматов строк подключения к БД:
* host:server;port:5432;user:root;password:secret;database:database-name (устаревший)
* postgres://user:password@server:5432/database-name

__Примечание__: параметр `SOURCE_TYPES` по умолчанию содержит значение `PG_TABLE`, т.к. проверка доступности таблиц сделано, только для `PostgreSQL`.

#### Авторизация
Используется Basic-авторизация. 
Токен передаётся либо в заголовке запроса `rpc-authorization`, либо в параметре запроса. 

#### Описание структуры БД

Пользователи хранятся в таблице `core.pd_users` и создаются при помощи функции `core.sf_create_user`:

<pre>
SELECT core.sf_create_user('user', 'qwe-123', '', '["datalens"]');
</pre>

На примере выше создаётся пользователь `user` с паролем `qwe-123`, без email, которые принадлежит роли `datalens`.

Пользователь может быть привязан обновленно к нескольким ролям: `SELECT core.sf_create_user('master', 'qwe-123', '', '["master", "admin"]');`

Чтобы создать новую роль требуется заполнить таблицу `core.pd_roles` и далее либо создать пользователя с новой ролью, либо обновить при помощи `core.pf_update_user_roles`.

##### Описание ролей

* master - роль, у которой есть возможность просматривать все коллекции и воркбуки без ограничений на редактирование (даже если проекты разные). Как "единичная" роль безполезна, требуется применять её совместно с администратором (`admin`).
* admin - роль для просмотра и создания новых объектов в datalens, есть возможность указания прав.
* user - пользователь системы, доступна возможность только просмотра.

##### Таблицы
* core.pd_accesses - описание прав доступа
* core.pd_roles - список ролей
* core.pd_user_devices - (beta) таблица устройств
* core.pd_userinroles - принадлежность пользователя к ролям
* core.pd_users - пользователи
* core.sd_logs - системные логи

##### Функции
* core.pf_accesses - Получение прав доступа для пользователя
* core.pf_update_user_roles - Обновление ролей у пользователя
* core.sf_accesses - Системная функция для обработки прав
* core.sf_create_user - Создание пользователя
* core.sf_gen_key - (beta) Генерация ключа безопасности
* core.sf_reset_pwd - Сброс пароля пользователя
* core.sf_update_auth - Обновление информации об авторизации
* core.sf_update_pwd - Обновление пароля
* core.sf_user_devices - (beta) Получение информации об устройствах пользователя
* core.sf_users - Получение информации о пользователе
* core.sf_users_by_login_with_alias - Получение информации о пользователе (beta)
* core.sf_users_with_alias - Получение информации о пользователе (beta)
* core.sf_verify_user - Проверка пользователя на возможность авторизации

##### Безопасность

В системе предусмотрена возможность ограничения просмотра таблиц, например если требуется в редакторе отображать тольок определённый перечень. Для ограничения прав требуется в таблице `core.pd_accesses` добавить запись с указанием `схемы` или `наименования таблицы`.

Например:

<pre>
INSERT INTO core.pd_accesses(f_role, c_name, c_function, b_deletable, b_creatable, b_editable, b_full_control)
VALUES
(2,	NULL, 'opensource-demo.*',	false,	false,	false,	false);
</pre>

Код выше указывает, что требуется предоставить доступ для пользователя с ролю `2` к схеме `opensource-demo`. 

Можно и явно указать наименолвание таблицы:

<pre>
INSERT INTO core.pd_accesses(f_role, c_name, c_function, b_deletable, b_creatable, b_editable, b_full_control)
VALUES
(2,	NULL, 'opensource-demo.managers',	false,	false,	false,	false);
</pre>

__Примечание__: с версии `1.0.5` добавлена новая колонка `dl_id` - требуется для сопоставления (join) объекта datalens в БД.

#### О контейнерах
- akrasnov87/datalens-auth:0.1.0- хранится на [`docker hub`](https://hub.docker.com/repository/docker/akrasnov87/datalens-auth/general), можно заменить своим собрав командой `docker build --build-arg DOCKER_USER=dl -t akrasnov87/datalens-auth:0.1.0 .`

__Примечание__: `akrasnov87` - это мой логин на `docker hub`, локально можно собрать под любым именем.

## Для сохранения в docker-репозитории

По умолчанию храню контейнер в [docker hub](https://hub.docker.com/repository/docker/akrasnov87/datalens-auth/general)

<pre>
docker build --build-arg DOCKER_USER=dl -t akrasnov87/datalens-auth:0.1.5 .
docker push akrasnov87/datalens-auth:0.1.5
</pre>

Получение образа:
<pre>
docker pull akrasnov87/datalens-auth:0.1.5
</pre>

## Интеграция с Budibase

Требуется выполнить настройки:

* в Budibase требуется создать группу `datalens`;
* добавляем пользователей в эту группу;
* в БД datalens для роли `datalens` нужно проставить значение в поле `_id` (идентификатор роли в `budibase`);
* в настройках auth-us нужно заполнить переменную `BUDIBASE_URI` (адрес сервиса Budibase).

После авторизации в системе автоматически будет создан пользователь, для котрого можно назначать права.