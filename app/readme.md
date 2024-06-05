## Настройки приложения

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
name="datalens-auth"
# {application_name} - имя приложения
application_name="datalens-auth"
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
# {max_file_size} - максимальный размер данных
max_file_size="100mb"
# {auth_key_mode} - включен ли режим авторизации по ключу
auth_key_mode=true
# {primary_role} - первичная роль для определения администратора
primary_role=".master."
# {secodary_role} - вторичная роль для определения администратора
secodary_role=".admin."
# {pg_log} - логировать данные в PostgreSQL
pg_log=true
```
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
            "program": "${workspaceFolder}/bin/www",
            "args": ["conf=./dev.conf"]
        }
    ]
}
```

## Авторизация по ключу доступа

Чтобы включить эту функциональность, нужно установить параметр ``auth_key_mode`` в значение ``true``. Если и в данном случаи нужно будет возможность авторизоваться без ключа, можно в таблице ``pd_users`` в колонке ``b_key`` установить занчение ``false``

## Интеграция с Datalens

В RPC сервисе есть методы объекта:
* PN.datalens.* - 

### datalens.authorization 
Метод принимает информацию о запросе и возвращает результат со статусом 200 или 401
<pre>
[{'statusCode': 200, 'token': ...}]
</pre>
Так же дополнительно возвращается токен авторизации.

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
