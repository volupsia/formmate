#!/bin/bash

# Stop and remove the existing container if it exists
echo "Stopping and removing existing container..."
docker stop formmate-container || true
docker rm formmate-container || true

# Build the image from the parent directory
echo "Building Docker image..."
# Move to the parent directory to include both formmate and formcms in the context
cd ..
docker build -f formmate/Dockerfile -t formmate-integrated .

# Run the new container
echo "Starting new container..."
docker run -d \
  --name formmate-container \
  -p 5000:5000 \
  formmate-integrated

echo "Container formmate-container is up and running."
docker ps | grep formmate-container
