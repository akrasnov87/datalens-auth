Подробную инcтрукцию по установке и настройке сервиса смотреть на [OneDrive](https://1drv.ms/w/s!AnBjlQFDvsITgoM13WRav30J4TuIgA?e=0uR7hZ)

### Тестирование во вне

```
npm install -g localtunnel
lt --port 8000
```

### Загрузка на сервере

```
scp "skr-rpc-service.zip" a-krasnov@yantarenergo.it-serv.ru:/var/tmp/skr-rpc-service.zip
```

После обновления файлов не забываем обновлять каталог ``skr-rpc-service``

```
sudo chown -R www-data:www-data /var/www/skr-rpc-service
sudo chmod -R 774 /var/www/skr-rpc-service
```

И проверить, что доступ для записи файлов для каталога ``file_dir`` есть

```
ls -la
```

```
sudo chown -R www-data:www-data /var/www/skr-files
sudo chmod -R 777 /var/www/skr-files
```

Проверить на какие порты используются:

```
sudo netstat -ntlp
```

Если команда не найдена, то выполнить: ``sudo apt install net-tools``

### Настройка на Ubuntu 18.04 и выше

Полностью инструкция написана на странице http://tfs2017.compulink.local:8080/tfs/DefaultCollection/IServ.Mobile/_wiki/wikis/IServ.Mobile.wiki/1813/Настройка-RPC-сервиса