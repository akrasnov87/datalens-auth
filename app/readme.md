# Описание

Подробную документацию по сервису можно найти на сайте http://tfs2017.compulink.local:8080/tfs/DefaultCollection/IServ.Mobile/_wiki/wikis/IServ.Mobile.wiki/1813/Настройка-RPC-сервиса

Для настроки баланщировщика NXING используем:
<pre>
server {
    ...

    location /etalon {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        # локальный адрес NodeJS сервиса
        proxy_pass http://nodes-skr-etalon;

        # enable WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    ...
}

upstream nodes-skr-etalon {
    ip_hash;

    server 127.0.0.1:5006;
}
</pre>

## инициализация приложения

```
nodejs conf=/etc/path/prod.conf
```

По умолчанию используется порт 3000, но можно указать любой свободный.
При указание дополнительного аргумента debug будет сохраняться отладочная информация, но на боевом стенде лучше отключать, чтобы не засорять логи.
По умолчанию информация логируется в каталоге ~/logs.

```
# {port} - порт, на котором будет работать приложение
port=5000
# {virtual_dir_path} - виртуальный каталог, например /test (обращение будет http://my.domain.ru/test)
virtual_dir_path="/"
# {connection_string} - строка подключения к БД
connection_string="host:192.168.17.52;port:5432;user:skrmo-node;password:r8qVbNK~;database:skr-etalon-db"
# {debug} - ставить true если нужна информация для отладки приложения
debug=false 
# {thread} - количество потоков, если передать 0, то равно количеству ядер 
thread=8
# {name} - имя ресурса
name="СКРМО"
# {application_name} - имя приложения
application_name="skrmo"
# {access_buffer_expire} - период времени для хранение ключа безопасности в кэше (секунды)
access_buffer_expire=30
# {access_checkperiod} - период времени для проверки истекших ключей безопасности (секунды)
access_checkperiod=60
# {user_auth_expire} - период времени для хранение ключа авторизации в кэше (секунды)
user_auth_expire=15
# {user_checkperiod} - период времени для проверки истекших ключей авторизации (секунды)
user_checkperiod=30
# {query_limit} - лимит выборки из базы данных для одного запроса
query_limit=100000
# {mail_auth_user} - логин для авторизации на почтовом сервере
mail_auth_user=""
# {mail_auth_pwd} - пароль для авторизации на почтовом сервере
mail_auth_pwd=""
# {mail_host} - SMTP - сервер
mail_host=""
# {mail_port} - порт подключения
mail_port=465
# {mail_secure} - используется ли безопасное соединение
mail_secure=true
# {max_file_size} - максимальный размер данных
max_file_size="100mb"
# {report_url} - отчеты
report_url="https://skrmo.it-serv.ru/pentaho/api/repos/{0}/generatedContent?{1}"
# {report_userid} - логин пользователя для авторизации на pentaho
report_userid="skrmo-report"
# {report_password} - пароль пользователя для авторизации на pentaho
report_password=""
# {report_output} - тип возвращаемого контента
report_output="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
# {report_output_page_mode} - режим оторажения отчета
report_output_page_mode="flow"
# {report_mime_type} - режим оторажения отчета
report_mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
# {site} - адрес основного сайта
site="https://skrmo.it-serv.ru"
# {sync_storage} - путь для хранения файлов
sync_storage="./files"
# {auth_key_mode} - включен ли режим авторизации по ключу
auth_key_mode=true
# {file_dir} - каталог для хранения изображений
file_dir=""
# {socket_io_messages_size} - размер сообщения для Socket.IO Messages
socket_io_messages_size=8096
```

## соглашение об назначении версии приложения

В файле package.json есть свойство birthday в котором указывать "дата рождения приложения" на основе этой даты генерируется значение свойства version.
Дле генерации требуется установить расширение [node-version-1.0.1.vsix](https://1drv.ms/u/s!AnBjlQFDvsIT731gHXGyySlxy0VB?e=DIpfjT)

## автодокументирование

Дле генерации документации требуется установить расширение [docdash-plugin-1.0.11.vsix](https://1drv.ms/u/s!AnBjlQFDvsIThP04wNC8iC4vxFmhsw?e=7Fe2B0)

## настройка в VSCode

```
.vscode/launch.json

{
    // Используйте IntelliSense, чтобы узнать о возможных атрибутах.
    // Наведите указатель мыши, чтобы просмотреть описания существующих атрибутов.
    // Для получения дополнительной информации посетите: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}\\bin\\www",
            "args": ["conf=./dev.conf"]
        }
    ]
}
```

## Построение отчетов Pentaho

Для работы с отчета требуется указать следующие настройки

```
# {report_url} - отчеты
report_url="https://skr.it-serv.ru/pentaho/api/repos/{0}/generatedContent?{1}"
# {report_userid} - логин пользователя для авторизации на pentaho
report_userid="*****"
# {report_password} - пароль пользователя для авторизации на pentaho
report_password="********"
# {report_output} - тип возвращаемого контента
report_output="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
# {report_output_page_mode} - режим оторажения отчета
report_output_page_mode="flow"
# {report_output_page_mode} - режим оторажения отчета
report_mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

Значение ``report_output_page_mode`` может быть двух видов:

* application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
* pageable/pdf

Пример построения отчета:

```
GET ~/report/report_name.prpt?d_date=&f_division=&target=pageable/pdf

Headers
rpc-authorization: Token
Content-Type: application/json
```

## Авторизация по ключу доступа

Чтобы включить эту функциональность, нужно установить параметр ``auth_key_mode`` в значение ``true``. Если и в данном случаи нужно будет возможность авторизоваться без ключа, можно в таблице ``pd_users`` в колонке ``b_key`` установить занчение ``false``

## Chat
Обмен сообщениями производиться при помощи socket.io <b>4 версии</b>. Для отпарвик сообщений подписываемся на <b>messages</b>, а для изменения статуса на <b>status-messages</b>. См. файлы /modules/sync:
<pre>
messages-handeler.js
status-messages-handeler.js
</pre>

Для хранения в БД создана таблица <b>public.socket_io_messages</b>. 

<b>Примечание</b>: таблица автоматически создаётся в /bin/www 

<b>Внимание</b>: в настройке <code>socket_io_messages_size</code> хранится максимальное количество байтов в сообщении.

Получение списка сообщений:
<pre>
[{ action: "shell", method: "messages", data: [{ "offset": 0 }], type: "rpc", tid: 0 }]

...
    "id": "3f7a7fc8-0546-7749-00a8-cb3c640cb6d0",
    "c_url": "/file/socket.io/3f7a7fc8-0546-7749-00a8-cb3c640cb6d0",
    "c_data_type": "application/json",
    "c_to": "2",
    "c_from": "1",
    "b_delivered": false,
    "b_temporary": true,
    "dx_created": "2023-03-16T05:59:13Z",
    "dx_delivered": null
...
</pre>

## latest RabbitMQ 3.13
docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management

## Интеграция с Datalens

В RPC сервисе есть два метода:
* shell.datalens - проверка авторизации и наличие доступа
* shell.permissions - проверка прав для объекта

### shell.datalens 
Метод принимает информацию о запросе и возвращает результат со статусом 200 или 401
<pre>
[{'statusCode': 200, 'token': ...}]
</pre>
Так же дополнительно возвращается токен авторизации.

### shell.permissions
Метод проверки (переопределения) прав

#### root collection
Принимает пустой объект {}
<pre>
{
    createCollectionInRoot: true,
    createWorkbookInRoot: true
}
</pre>

#### collection
<pre>
{
    listAccessBindings: true,
    updateAccessBindings: true,
    createCollection: true,
    createWorkbook: true,
    limitedView: true,
    view: true,
    update: true,
    copy: true,
    move: true,
    delete: true
}
</pre>

#### workbook
<pre>
{
    listAccessBindings: true,
    updateAccessBindings: true,
    createCollection: true,
    createWorkbook: true,
    limitedView: true,
    view: true,
    update: true,
    copy: true,
    move: true,
    delete: true
}
</pre>

## Список функций БД
* core.sf_verify_user
* core.sf_users_with_alias
* core.sf_user_devices
* core.sf_users_by_login_with_alias
* core.sf_update_auth
* dbo.of_mui_sd_table_change
