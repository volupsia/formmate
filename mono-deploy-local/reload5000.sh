#!/bin/bash

echo "Stopping existing formcms container..."
docker stop formcms 2>/dev/null || true

echo "Removing existing formcms container..."
docker rm formcms 2>/dev/null || true

echo "Starting new formcms container..."
docker run -d \
  --name formcms \
  -p 5000:5000 \
  -v formcms_data:/data \
  -e DATABASE_PROVIDER=0 \
  -e "CONNECTION_STRING=Data Source=/data/cms.db" \
  -e FORMCMS_DATA_PATH=/data \
  -e "DATABASE_URL=file:/data/mate.db" \
  formcms-mono-deploy

echo "Done!"
