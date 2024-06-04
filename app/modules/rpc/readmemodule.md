#### Описание

Модуль для обработки [RPC](https://docs.sencha.com/extjs/6.7.0/guides/backend_connectors/direct/specification.html) запросов.

#### Способы получения и обработки данных

**Формат возвращения результата**

```
{
    meta: {
        success: boolean,
        msg: string,
        fullMsg: string
    },
    result: any|string
}
```
, где:

* meta: any - мета информация запроса
    * success: boolean - результат выполнения операции, если данный параметр равен **false**, то поле **msg** будет заполнено
    * msg: string - текст сообщения при ошибке (success = false)
    * fullMsg: string - иногда в данном свойстве выводиться полный текст ошибки, он предназначен для разработчика  
* result: any|string - результат запроса

#### Router (обработчики запросов)

* POST ~/changePassword - изменение пароля пользователя. См. [тут](/docs?project=skr-rpc-service&file=modules/rpc/router/changePassword.js)
* POST ~/auth - авторизация пользователя. См.
* GET ~/rpc/meta - получение мета для RPC. См. [тут](/docs?project=skr-rpc-service&file=modules/rpc/router/rpc.js)
* POST ~/rpc - выполнение RPC
* POST ~/auth - авторизация. См. https://www.appcode.pw/?page_id=459
* GET ~/cache/reload - сброс кэша См. [тут](/docs?project=skr-rpc-service&file=modules/rpc/router/cache.js)

#### Базовый shell команды

В файле [shell-context](/docs?project=skr-rpc-service&file=modules/custom-context/shell.js) есть функции которые можно вызывать через команду PN.shell...

#### Обработка запросов websocket

Статья на эту тему описана [тут](https://www.appcode.pw/?p=1256)

#### Обработка RPC запросов

Статья на эту тему описана [тут](https://www.appcode.pw/?p=463)