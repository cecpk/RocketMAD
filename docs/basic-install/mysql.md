# Installing MySQL

**This guide is primarily for Windows.**
**However, preliminary Linux (Debian) instructions are below (VII)**
**Preliminary Docker (modern Linux OS w/ Docker & git installed) instructions below (VIII)**

## I. Prerequisites
1. Have the "develop" build of RocketMap. [Available here.](https://rocketmap.readthedocs.io/en/develop/basic-install/index.html)
2. Downloaded [MariaDB](https://downloads.mariadb.org/)

## II. Installing MariaDB
1. Run the install file, for me this was: mariadb-10.1.16-winx64.msi
2. Click next
3. Check "I accept the terms in the License Agreement" and click next
4. If you wish to change the installation location do that. If not click next.
5. Decide whether or not you want a password on your root account, if you don't put a password on it this database cannot be accessed from remote machines, which isn't necessary for what were doing. But if you do want a password go to 5a, if not go to 5b.
   - **5a.** Input the password you want into "new root password", and again into the "confirm" textbox.
   - **5b.** Uncheck "modify password for database user 'root'.
6. Click next
7. All the default options are acceptable here. Hit next.
8. This screen wants to know if you can submit anonymous usage data, feel free to hit next or if you'd like to contribute data go ahead and check "enable the Feedback plugin and submit anonymous usage information" and then click next.
9. Click install. Administrator privileges required.
10. Congratulations you've installed MariaDB and it's all downhill from here.

## III. Setting up your database
1. Go to your windows start menu and locate MariaDB.
2. Open "MySQL Client"
3. If you created a password in step 5a above enter it now and hit enter. If you didn't create a password simply hit enter.
4. One this command prompt screen you'll want to enter:

   ```sql
   CREATE DATABASE rocketmapdb;
   CREATE USER 'rocketmapuser'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON rocketmapdb . * TO 'rocketmapuser'@'localhost';
   exit
   ```
   You can change `rocketmapdb` to whatever you want the name of the database to be. Also, be sure to change `'password'` to the password you want to use.
5. If the database creation was successful it will tell you "Query OK, 1 row affected". If it doesn't echo that back at you then you either received an error message, or it just created a blank line. I've detailed how to fix common errors, and the blank line below.
   - **Blank line:**
     You simply missed the ";" in the CREATE DATABASE command. Essentially you didn't close of the line, so the program thinks you still have more information to input. Simply insert a ; onto the blank line and hit enter and it should echo "Query OK" at you.
   - **Error: "ERROR 1064 (42000): You have an error in your SQL syntax"**
     Double check that you put in the CREATE DATABASE command exactly as it's typed above. If you had the blank line error, and then retyped the CREATE DATABASE line it will spit this at you because you actually typed `CREATE DATABASE rocketmapdb CREATE DATABASE rocketmapdb;`. Simply retry the `CREATE DATABASE rocketmapdb;` and don't forget your `;`.
   - **Error: "ERROR 1007 (HY000): Can't create database 'rocketmapdb'; database exists"**
     The rocketmapdb database already exists.
     If you're trying to start a fresh database you'll need to execute `DROP DATABASE rocketmapdb`, and then run `CREATE DATABASE rocketgomapdb`. If you want to keep the rocketmapdb but start a new one, change the name.
   - **(1045, u"Access denied for user 'rocketmapuser'@'localhost' (using password: YES)")**
     You might be using **password** as your password for the database user **rocketmapuser**. Simply run `ALTER USER 'rocketmapuser'@'localhost' IDENTIFIED BY 'password';` and replace `'password'` with the password you want to use.
6. Congratulations, your database is now setup and ready to be used.

## IV. Setting up the Config.ini file
### Config.ini
1. Open file explorer to where you've extracted your develop branch of RocketMap
2. Navigate to the "config" folder.
3. Right-click and open config.ini in your text editor of choice. I used Notepad++.
4. You're looking to fill in all the values in this file. If you've already ran and used the RocketMap like was required in step 1 of the prerequisites you should be familiar with most of this information, but I've broken it all down below. On every line that you change/add a value make sure you remove the `#` as that makes the program think it is a comment, which obviously ignores the values you input.
    - **Authentication Settings:** You'll need to pick between using google, or pokemon trainer club login information. The RocketMap initial setup recommends ptc.
        - Change "auth-service" to ptc or google, whichever you choose.
        - Change "username" to your respective username for the selected service.
        - Change "password" to your respective password for the username on the selected service.
    - **Database Settings:** This is the important section you will want to modify.
        - Change "db-host" to "127.0.0.1"
        - Change "db-name:" to "rocketmapdb"
        - Change "db-user:" to "rocketmapuser"
        - Change "db-pass" to the password you chose in section III step 4, or leave it blank if you chose to roll with no password.
    - **Search Settings:** You only need to change this if you want to only run one location, or wish to disable gyms/pokemon/pokestops for all locations, or to have a universal thread count, scan delay, or step limit. I chose to not edit anything in the new config.ini.
    - **Misc:** This only has one setting and that's the google maps api key. If you don't have one, or don't know what that is please see [this](http://rocketmap.readthedocs.io/en/develop/basic-install/google-maps.html) wiki page for the RocketMap project.
        - Change "gmaps-key:" to contain your google maps API key.
    - **Webserver Settings:** This is how your server knows where to communicate.
        - Change "host" to the host address you should already have setup.
        - Change "port" is whatever port you are running the map through, default is 5000.
5. Make sure you've removed all of the `#` from any line with a value you inputted. Indent the comments that are after the values as well, so they are on the following line below the variable they represent. For example:
   ```
   # Database settings
   db-name: mydb
   # Required
   ```
6. Go to File->Save as... and make sure you save this file into the same directory as the "config.ini.example", but obviously save it as "config.ini". Make sure it's saved as a .ini file type, and not anything else or it won't work.
7. You're now done configuring your config.ini file.

MySQL is now installed, return to the main install guide. If you've encountered any errors it's most likely due to missing a parameter you commented out when you call runserver.py or you mis-typed something in your `config.ini`. However, if it's neither of those issues and something not covered in this guide hop into the RocketMap discord server, and go to the help channel. People there are great, and gladly assist people with troubleshooting issues.

## Set up MySQL on a second computer, seperate from RM instances.

In this example, computer running RocketMap will be `Server A` while computer running MySQL will be `Server B`.

You will follow above directions for II and III on Server B and directions for IV on Server A.
***However:*** The following steps will be different.

Server B- III

You will need to grant your account permission to use the database outside of your database server.

```sql
   CREATE DATABASE rocketmapdb;
   CREATE USER 'rocketmapuser'@'%' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON rocketmapdb . * TO 'rocketmapuser'@'%';
   exit
```

Server A- IV

You need to tell RocketMap where the database is!

```
**Database Settings:** This is the important section you will want to modify.
 - Change "db-host" to [IP ADDDRESS OF SERVER B]
 - Change "db-name:" to "rocketmapdb"
 - Change "db-user:" to "rocketmapuser"
 - Change "db-pass" to the password you chose in section III step 4, or leave it blank if you chose to roll with no password.
```
***AND***
```
 **Webserver Settings:** This is how your server knows where to communicate.
 - Change "host" to "0.0.0.0"
```


## Linux Instructions
1. Visit https://downloads.mariadb.org/mariadb/repositories/ and download mariaDB
2. Login to your MySQL DB
   - mysql -p
   - Enter your password if you set one
3. Create the DB

   ```
   CREATE DATABASE rocketmapdb;
   CREATE USER 'rocketmapuser'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON rocketmapdb.* TO 'rocketmapuser'@'localhost';
   ```

4. Quit the MySQL command line tool `quit`
5. Edit the `config/config.ini` file

   ```
   # Database settings
   db-host: 127.0.0.1      
   db-name: rocketmapdb # required
   db-user: rocketmapuser    # required
   db-pass: YourPW         # required
   ```

## Docker Settings w/ Let's Encrypt

Note: These are preliminary until better Docker support in the official container hosted on Docker Hub
Note: These commands require git to be installed

```
docker build -t pokemap https://github.com/RocketMap/RocketMap.git:develop
docker run --name pokesql -e MYSQL_ROOT_PASSWORD=some-string -e MYSQL_DATABASE pokemap -d mysql:5.6
```

_only pain comes from mysql5.7 and beyond_

```
docker run --name mainmap -d --link pokesql pokemap --auth-service=ptc \
  --username=youruser --password=yourpassword --db-host=pokesql \
  --db-name=pokemap --db-user=root --db-pass=some-string --gmaps-key=someapikey
```

_all optional arguments except db type omitted, including --location (you can set it in the web ui!)_

_OPTIONAL: always scan Austin, TX (SQL benchmark?)_

```
docker run --name scanagent -d --link pokesql pokemap --no-server \
 --auth-service=ptc --location="Austin, TX" --username=yourotheruser \
 --password=yourotherpassword --db-host=pokemap \
 --db-name=pokemap --db-user=root --db-pass=some-string \
 --gmaps-key=some-api-key
```
