#!/bin/bash

# Purpose: Safely dismantle the temporary verification database and cleanup resources.

CONTAINER_NAME="frh-verify-db"

echo "--- Dismantling Local Verification Environment ---"

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping and removing container: $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" > /dev/null
    docker rm "$CONTAINER_NAME" > /dev/null
    echo "✅ Environment dismantled successfully."
else
    echo "No verification environment found running."
fi
