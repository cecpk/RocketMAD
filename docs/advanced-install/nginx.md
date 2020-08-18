# Nginx

If you do not want to expose RocketMAD to the web directly or you want to place it under a prefix, follow this guide:

Assuming the following:

* You are running RocketMAD on the default port 5000
* You've already made your machine available externally (for example, [port forwarding](https://rocketmad.readthedocs.io/en/latest/extras/external.html))

1. Install nginx (I'm not walking you through that, google will assist) - http://nginx.org/en/linux_packages.html
2. In /etc/nginx/nginx.conf make sure the following is added:

   ```
   include conf.d/*.conf;
   ```

3. Create a file /etc/nginx/conf.d/rocketmad.conf and place the following in it:

   ```
   upstream app_server {
       # fail_timeout=0 means we always retry an upstream even if it failed
       # to return a good HTTP response.
       server 127.0.0.1:5000 fail_timeout=0;
   }
   
   server {
       listen 80;
       listen [::]:80;
       
       # Set the correct host(s) for your site.
       server_name my_domain.com www.my_domain.com;
       
       # Path to your RocketMAD folder.
       root /path/to/RM;
       
       location / {
           # Checks for static file, if not found proxy to app.
           try_files $uri @proxy_to_app;
       }
       
       location @proxy_to_app {
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Host $http_host;
           # We don't want nginx trying to do something clever with
           # redirects, we set the Host: header above already.
           proxy_redirect off;
           proxy_pass http://app_server;
       }
   }
   ```

In case you want to use a subdirectory, e.g. http://my_domain.com/map, add the following instead of the above:

   ```
   upstream app_server {
       # fail_timeout=0 means we always retry an upstream even if it failed
       # to return a good HTTP response.
       server 127.0.0.1:5000 fail_timeout=0;
   }
   
   server {
       listen 80;
       listen [::]:80;
       
       # Set the correct host(s) for your site.
       server_name my_domain.com www.my_domain.com;
       
       # Path to your RocketMAD folder.
       root /path/to/RM;
       
       location /map {
           # Checks for static file, if not found proxy to app.
           try_files $uri @proxy_to_app;
       }
       
       location @proxy_to_app {
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Host $http_host;
           proxy_set_header SCRIPT_NAME /map;
           # We don't want nginx trying to do something clever with
           # redirects, we set the Host: header above already.
           proxy_redirect off;
           proxy_pass http://app_server;
       }
   }
   ```

## Add a free SSL certificate to your site:

1. Install certbot: https://certbot.eff.org/instructions
2. Run `certbot certonly -d my_domain.com www.my_domain.com` to generate certificates
3. Update your rocketmap.conf file, see example below
4. Certificates last for 3 months and can be renewed by running `certbot renew`

## SSL example config

```
upstream app_server {
    # fail_timeout=0 means we always retry an upstream even if it failed
    # to return a good HTTP response.
    server 127.0.0.1:5000 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;

    # Set the correct host(s) for your site.
    server_name my_domain.com www.my_domain.com;

    return 301 https://my_domain.com$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    # Set the correct host(s) for your site.
    server_name my_domain.com www.my_domain.com;
    
    # Path to your RocketMAD folder.
    root /path/to/RM;

    ssl_certificate /etc/letsencrypt/live/my_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/my_domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        # Checks for static file, if not found proxy to app.
        try_files $uri @proxy_to_app;
    }
    
    location @proxy_to_app {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        # We don't want nginx trying to do something clever with
        # redirects, we set the Host: header above already.
        proxy_redirect off;
        proxy_pass http://app_server;
    }
}
```

Please be sure to change the ssl_certificate and ssl_certificate_key paths to point to your cert file and key.

## Adding simple httpd Authentication. (Outdated)

This will guide you through setting up simple HTTP Authentication using nginx and reverse proxy protocols. These instructions are written for someone using a Debian/Ubuntu VPS. Your enviroment may have slightly different requirements, however the concepts as a whole should still stand. This guide assumes you have nginx installed and running, and a `conf.d/*.conf` file created, such as `/etc/nginx/conf.d/rocketmap.conf`, as the example above provides, and that you're running your service on port 5000, and want it to be accessable at http://your_ip/go/, although it supports other ports and locations.  

`*` denotes a wildcard, and will be used to stand for your site's `*.conf` file, please __do not__ literally type `sudo nano /etc/nginx/conf.d/*.conf`.

1. Create a .htpasswd file inside `/etc/nginx/`. Some suggested methods to create a .htpasswd file are below.
   - Linux users can use the apache2-tools package to create the files.  
      -First, get the apache2-utils package
      ```
      sudo apt-get install apache2-utils
      ```
      -Then run the htpasswd command
      ```
      sudo htpasswd -c /etc/nginx/.htpasswd exampleuser
      ```

      This will prompt you for a new password for user exampleuser. Remove the `-c` tag for additional entries to the file. Opening the file with a text exitor such as nano should show one line for each user, with an encrypted password following, in the format of user:pass.

   - Manual generation of the file can be done using tools such as: http://www.htaccesstools.com/htpasswd-generator/. After manually generating the file, please place it in `/etc/nginx/`, or wherever your distro installs `nginx.conf` and the rest of your config files.
2. Open your `*.conf` file with a text editor, with a command such as `sudo nano /etc/nginx/conf.d/rocketmap.conf`. Add the following two lines underneath the domain path.

   ```
   auth_basic "Restricted";
   auth_basic_user_file /etc/nginx/.htpasswd;
   ```

   If your `*.conf` file matches the example provided above, you should have the following.

   ```
   server {
       listen 80;

       location /go/ {
          auth_basic "Restricted";
          auth_basic_user_file /etc/nginx/.htpasswd;
          proxy_pass http://127.0.0.1:5000/;
       }
   }
   ```
   Now, we're going to go ahead and fill out the `*.conf` file with the rest of the information to make our service work, and shore up our nginx config, by appending the following between the authentication block and proxy_pass.

   ```
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto http;
   proxy_set_header Host $http_host;
   proxy_redirect off;
   ```

   Here is a fully completed example `*.conf`, with working httpd authentication. Notice, this example does not use SSL / 443, although the method can be adapted to it!

   ```
   upstream pokemonmap {
      server 127.0.0.1:5000 fail_timeout=0
   }
   server {
      listen 80;
      server_name [sub.domain.com] [your_ip];

      location /go/ {
         auth_basic "Restricted";
         auth_basic_user_file /etc/nginx/.htpasswd;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto http;
         proxy_set_header Host $http_host;
         proxy_redirect off;
         proxy_pass http://[your_ip]:5000;
         break;
      }
   }
   ```
3. Test your nginx configuration using the command `sudo nginx -t`. If this returns a positive result, restart the nginx service using `sudo service nginx restart`.
4. Verify your configuration is working by loading http://your_ip/go/ or http://sub.your.domain/go/, or however else you have it set in your `*.conf`. Please verify it's working before proceeding to step 5, or it will be much harder to troubleshoot!

     Troubleshooting:
      - **I can't reach my server at http://your_ip/go/!**

         Check http://your_ip:5000/. If you cannot see it there, your issue lies with your server, not with nginx! If you can see it there, but cannot see it at http://your_ip/go/, your issue lies with nginx. Please check your config files to make sure they are pointing at the right places, and that your `sudo nginx -t` checks out.

      - **nginx -t doesn't check out.**

         Check the error messages for which line is creating the error, and work your way backwards from there. Many times it's just a missed `;` or `}`.

5. Finally, we're going to modify our runserver.py command to operate with the `-H 127.0.0.1` flag, only allowing our webapp to be accessable from Localhost. As nginx is running on the local system, nginx will still be able to fetch the webapp, and serve it, through the proxy and authentication, to remote users, but remote users will not be able to connect directly to the webapp itself. If your runserver command is

   ```python runserver.py -u user -p pass -k key -l "my,coords" -st 10 -P 5000```

   You are going to want to update it to the following:

   ```python runserver.py -u user -p pass -k key -l "my,coords" -st 10 -P 5000 -H 127.0.0.1```

   From there, we're going to want to check and see that you can get to your server, albeit through authentication, at http://your_ip/go/, and that you cannot get to your server at http://your_ip/go:5000/. If that works, you're all set up!
