#### Описание

```
var Console = require('./log');

Console.log('');
```

В библиотеке доступно три категории:
* log - обычное логирование
* pay - логирование платежей
* err - общие ошибки

```
Console.log('action', 'err');
// OR
Console.log('action', 'log');
// OR
Console.log('action', 'pay');
```

Записанная информация сохраняется в каталоге ~/log
* err.log
* log.log
* pay.log