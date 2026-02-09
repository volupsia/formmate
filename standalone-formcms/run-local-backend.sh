#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

echo "Checking if Docker DB is running..."
if [ ! "$(docker ps -q -f name=standalone-formcms-db-1)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=standalone-formcms-db-1)" ]; then
        # cleanup
        echo "Removing existing stopped container..."
        docker rm standalone-formcms-db-1
    fi
    echo "Starting Database Container..."
    docker-compose up -d db
    echo "Waiting for Database to be ready..."
    sleep 5
fi

echo "Starting FormCMS Backend..."
echo "Press Ctrl+C to stop."

# Go to repository root to run project
cd ../..
dotnet run --project formcms/server/FormCMS.App/FormCMS.App.csproj
