# Basic docker image for RocketMap
# Usage:
#   docker build -t rocketmap .
#   docker run -d -P rocketmap -a ptc -u YOURUSERNAME -p YOURPASSWORD -l "Seattle, WA" -st 10 --gmaps-key CHECKTHEWIKI

# Stage 0: build static assets using Node
FROM node:12-slim

WORKDIR /usr/src/app

COPY package.json /usr/src/app/

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        ca-certificates git unzip \
 && npm install

COPY Gruntfile.js static01.zip /usr/src/app/
COPY static /usr/src/app/static

# Build the assets - later we'll copy it to the app's image
RUN npm run build


# Stage 1: Build the actual image
FROM python:3.6-slim

# Working directory for the application
WORKDIR /usr/src/app

COPY requirements.txt /usr/src/app

# Install app's dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential curl imagemagick \
 && pip install --no-cache-dir dumb-init \
 && pip install --no-cache-dir -r requirements.txt \
 && rm -rf /var/lib/apt/lists/* \
 && apt-get purge -y --auto-remove build-essential

# Default port the webserver runs on
EXPOSE 5000

# Copy everything to the working directory (Python files, templates, config) in one go.
COPY . /usr/src/app/
# Copy compiled statics from stage 0
COPY --from=0 /usr/src/app/static /usr/src/app/static

# Set Entrypoint with hard-coded options
ENTRYPOINT ["dumb-init", "-r", "15:2", "python", "./runserver.py", "--host", "0.0.0.0"]
